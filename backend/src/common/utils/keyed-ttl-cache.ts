import { TtlCache } from './ttl-cache';

type KeyedTtlCacheOptions = {
  prefix: string;
  ttlMs?: number;
  staleTtlMs?: number;
};

export class KeyedTtlCache<T> {
  private readonly prefix: string;
  private readonly ttlMs?: number;
  private readonly staleTtlMs?: number;
  private readonly caches = new Map<string, TtlCache<T>>();

  constructor(options: KeyedTtlCacheOptions) {
    this.prefix = options.prefix;
    this.ttlMs = options.ttlMs;
    this.staleTtlMs = options.staleTtlMs;
  }

  getOrLoad(key: string, loader: () => Promise<T>) {
    let cache = this.caches.get(key);
    if (!cache) {
      cache = new TtlCache<T>({
        key: `${this.prefix}:${key}`,
        ttlMs: this.ttlMs,
        staleTtlMs: this.staleTtlMs,
      });
      this.caches.set(key, cache);
    }

    return cache.getOrLoad(loader);
  }

  invalidate(key?: string) {
    if (key !== undefined) {
      const cache = this.caches.get(key);
      cache?.invalidate();
      this.caches.delete(key);
      return;
    }

    for (const cache of this.caches.values()) {
      cache.invalidate();
    }
    this.caches.clear();
  }
}
