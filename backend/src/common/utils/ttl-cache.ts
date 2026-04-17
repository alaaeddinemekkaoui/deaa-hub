import { getCache } from '@vercel/functions';

type TtlCacheOptions = {
  key: string;
  ttlMs?: number;
  staleTtlMs?: number;
};

type CacheEnvelope<T> = {
  value: T;
  freshUntil: number;
  staleUntil: number;
};

const shouldUseVercelRuntimeCache =
  process.env.VERCEL_ENABLE_RUNTIME_CACHE === '1' ||
  process.env.VERCEL_ENABLE_RUNTIME_CACHE === 'true';

const runtimeCache = shouldUseVercelRuntimeCache
  ? getCache({
      namespace: process.env.VERCEL_RUNTIME_CACHE_NAMESPACE ?? 'deaa-hub',
    })
  : null;

function isCacheEnvelope<T>(value: unknown): value is CacheEnvelope<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Partial<CacheEnvelope<T>>;
  return (
    'value' in entry &&
    typeof entry.freshUntil === 'number' &&
    typeof entry.staleUntil === 'number'
  );
}

/**
 * Lightweight stale-while-revalidate cache.
 * Uses in-memory storage everywhere, and can optionally mirror entries into
 * Vercel Runtime Cache when explicitly enabled for non-Hobby deployments.
 */
export class TtlCache<T> {
  private data: T | undefined = undefined;
  private freshUntil = 0;
  private staleUntil = 0;
  private inFlight: Promise<T> | null = null;
  private readonly key: string;
  private readonly ttlMs: number;
  private readonly staleTtlMs: number;

  constructor(options: TtlCacheOptions) {
    this.key = options.key;
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;
    this.staleTtlMs = options.staleTtlMs ?? this.ttlMs;
  }

  get(): T | undefined {
    if (Date.now() < this.freshUntil) return this.data;
    return undefined;
  }

  getStale(): T | undefined {
    if (Date.now() < this.staleUntil) return this.data;
    return undefined;
  }

  set(value: T): void {
    const entry = this.createEntry(value);
    this.applyEntry(entry);
    void this.setRemoteEntry(entry);
  }

  invalidate(): void {
    this.data = undefined;
    this.freshUntil = 0;
    this.staleUntil = 0;
    this.inFlight = null;
    void this.deleteRemoteEntry();
  }

  async getOrLoad(loader: () => Promise<T>): Promise<T> {
    const fresh = this.get();
    if (fresh !== undefined) {
      return fresh;
    }

    const stale = this.getStale();
    if (stale !== undefined) {
      if (!this.inFlight) {
        this.inFlight = loader()
          .then((value) => {
            this.set(value);
            return value;
          })
          .finally(() => {
            this.inFlight = null;
          });
      }

      return stale;
    }

    const remoteEntry = await this.getRemoteEntry();
    if (remoteEntry) {
      this.applyEntry(remoteEntry);
      if (Date.now() < remoteEntry.freshUntil) {
        return remoteEntry.value;
      }

      if (Date.now() < remoteEntry.staleUntil) {
        if (!this.inFlight) {
          this.inFlight = this.reload(loader);
        }

        return remoteEntry.value;
      }
    }

    if (!this.inFlight) {
      this.inFlight = this.reload(loader);
    }

    return this.inFlight;
  }

  private createEntry(value: T): CacheEnvelope<T> {
    const now = Date.now();
    return {
      value,
      freshUntil: now + this.ttlMs,
      staleUntil: now + this.ttlMs + this.staleTtlMs,
    };
  }

  private applyEntry(entry: CacheEnvelope<T>): void {
    this.data = entry.value;
    this.freshUntil = entry.freshUntil;
    this.staleUntil = entry.staleUntil;
  }

  private async reload(loader: () => Promise<T>): Promise<T> {
    return loader()
      .then((value) => {
        this.set(value);
        return value;
      })
      .finally(() => {
        this.inFlight = null;
      });
  }

  private async getRemoteEntry(): Promise<CacheEnvelope<T> | null> {
    if (!runtimeCache) {
      return null;
    }

    try {
      const entry = await runtimeCache.get(this.key);
      if (!isCacheEnvelope<T>(entry)) {
        return null;
      }

      return entry;
    } catch {
      return null;
    }
  }

  private async setRemoteEntry(entry: CacheEnvelope<T>): Promise<void> {
    if (!runtimeCache) {
      return;
    }

    const ttl = Math.ceil((entry.staleUntil - Date.now()) / 1000);
    if (ttl <= 0) {
      return;
    }

    try {
      await runtimeCache.set(this.key, entry, {
        ttl,
        name: this.key,
      });
    } catch {
      // Fall back to the in-memory layer if Vercel Runtime Cache is unavailable.
    }
  }

  private async deleteRemoteEntry(): Promise<void> {
    if (!runtimeCache) {
      return;
    }

    try {
      await runtimeCache.delete(this.key);
    } catch {
      // Best-effort invalidation keeps local behavior intact even if remote deletion fails.
    }
  }
}
