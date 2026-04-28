/** Simple in-process TTL cache. Thread-safe within a single Node.js event loop. */
export class TtlCache<T = unknown> {
  private readonly store = new Map<string, { data: T; expiresAt: number }>();

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  /** Delete all keys that start with the given prefix. */
  delByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }
}
