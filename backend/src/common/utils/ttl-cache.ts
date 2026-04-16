/**
 * Lightweight in-process TTL cache.
 * Used for rarely-changing reference data (cycles, options, teacher roles/grades).
 * No external dependencies required.
 */
export class TtlCache<T> {
  private data: T | undefined = undefined;
  private expiresAt = 0;

  constructor(private readonly ttlMs: number = 5 * 60 * 1000) {}

  get(): T | undefined {
    if (Date.now() < this.expiresAt) return this.data;
    return undefined;
  }

  set(value: T): void {
    this.data = value;
    this.expiresAt = Date.now() + this.ttlMs;
  }

  invalidate(): void {
    this.expiresAt = 0;
  }
}
