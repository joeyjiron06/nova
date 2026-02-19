import type {
  CacheEntry,
  CacheEntryMeta,
  CacheStore,
  CacheWrapOptions,
  SetCacheOptions,
} from "../cache.types";

export default class MemoryStore implements CacheStore {
  private map: Map<string, CacheEntry<Promise<unknown>>>;

  constructor() {
    this.map = new Map();
  }

  async clear(): Promise<void> {
    this.map.clear();
  }

  async set<V>(
    key: string,
    value: V,
    options?: SetCacheOptions,
  ): Promise<void> {
    this.map.set(key, {
      key,
      value: Promise.resolve(value),
      expiresAt: options?.expiresAt,
    });
  }

  async get<V>(key: string): Promise<CacheEntry<V> | undefined> {
    const promiseEntry = this.map.get(key);

    if (!promiseEntry) {
      return undefined;
    }

    const value = await promiseEntry.value;

    return {
      key,
      value: value as V,
      expiresAt: promiseEntry.expiresAt,
    };
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async meta(): Promise<CacheEntryMeta[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return Array.from(this.map.values()).map(({ value, ...meta }) => meta);
  }

  async getMeta(key: string): Promise<CacheEntryMeta | undefined> {
    const entry = await this.get(key);

    if (!entry) {
      return undefined;
    }

    return {
      key: entry.key,
      expiresAt: entry.expiresAt,
    };
  }

  async wrap<V>(
    key: string,
    fn: () => Promise<V>,
    options?: CacheWrapOptions,
  ): Promise<V> {
    if (options?.disableCache) {
      return fn();
    }

    const cacheEntry = this.map.get(key);

    if (cacheEntry && !this.isExpired(cacheEntry) && !options?.forceRefresh) {
      return cacheEntry.value as Promise<V>;
    }

    const newValuePromise = fn();

    this.map.set(key, {
      key,
      value: newValuePromise,
      expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
    });

    return newValuePromise;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    if (entry.expiresAt === undefined) {
      return false;
    }

    return Date.now() > entry.expiresAt;
  }
}
