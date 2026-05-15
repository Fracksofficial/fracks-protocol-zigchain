"use client";

/**
 * QueryCache - In-memory cache with TTL and request deduplication.
 *
 * Solves two performance problems:
 * 1. **Deduplication**: If two components fire the same RPC query concurrently,
 *    only one network request is made. The second caller receives the same promise.
 * 2. **TTL caching**: Results are cached for a configurable duration so
 *    identical queries within the TTL window return instantly without hitting the RPC.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 30_000; // 30 seconds

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inflight = new Map<string, Promise<any>>();

  /**
   * Execute a query with caching and deduplication.
   * @param key - Unique cache key for this query
   * @param fetcher - Async function that performs the actual query
   * @param ttlMs - Time-to-live in milliseconds (default: 30s)
   */
  async query<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs = DEFAULT_TTL_MS,
  ): Promise<T> {
    // 1. Check cache
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    // 2. Check if there's already an in-flight request for this key
    const inflight = this.inflight.get(key);
    if (inflight) {
      return inflight as Promise<T>;
    }

    // 3. Execute the fetcher with deduplication
    const promise = fetcher()
      .then((data) => {
        this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
        this.inflight.delete(key);
        return data;
      })
      .catch((error) => {
        this.inflight.delete(key);
        throw error;
      });

    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Invalidate a specific cache entry.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all entries whose key starts with the given prefix.
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
    // Don't clear inflight - let pending requests finish
  }
}

// Singleton instance
export const queryCache = new QueryCache();
