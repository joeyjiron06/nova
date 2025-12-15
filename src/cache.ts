import type {
  CacheEntryMeta,
  CacheOptions,
  CacheStore,
  CacheWrapOptions,
} from "./cache.types";

export class Nova {
  private readonly store: CacheStore;
  private readonly options: CacheOptions;

  constructor(options: CacheOptions) {
    this.options = options;
    this.store = options.store;
  }

  setDefaultTTL(ttl: number): void {
    this.options.ttl = ttl;
  }

  async get<V>(key: string): Promise<V | undefined> {
    const cacheEntry = await this.store.get<V>(key);

    if (!cacheEntry) {
      return undefined;
    }

    if (this.isExpired(cacheEntry)) {
      await this.store.delete(cacheEntry.key);
      return undefined;
    }

    return cacheEntry.value;
  }

  /**
   * Sets a value in the cache with the given key.
   * If no ttl is provided, the default ttl from the cache options is used.
   * If 0 is provided for ttl, the entry does not expire.
   */
  async set<V>(key: string, value: V, ttl?: number): Promise<void> {
    const resolvedTTL = this.resolveTTL(ttl);

    const expiresAt = resolvedTTL ? Date.now() + resolvedTTL : undefined;

    await this.store.set<V>(key, value, { expiresAt });
  }

  async delete(key: string): Promise<void> {
    return this.store.delete(key);
  }

  async wrap<V>(
    key: string,
    fn: () => Promise<V>,
    options?: CacheWrapOptions
  ): Promise<V> {
    if (options?.disableCache) {
      return fn();
    }

    const cachedValue = await this.get<V>(key);

    if (cachedValue !== undefined && !options?.forceRefresh) {
      return cachedValue;
    }

    const result = await fn();

    await this.set<V>(key, result, options?.ttl);

    return result;
  }

  async has(key: string): Promise<boolean> {
    const cacheEntryMeta = await this.store.getMeta(key);

    return cacheEntryMeta !== undefined && !this.isExpired(cacheEntryMeta);
  }

  async meta(): Promise<CacheEntryMeta[]> {
    return this.store.meta();
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }

  private isExpired(entry: CacheEntryMeta): boolean {
    if (entry.expiresAt === undefined) {
      return false;
    }

    return Date.now() > entry.expiresAt;
  }

  private resolveTTL(ttl?: number): number | undefined {
    const resolvedTTL = ttl ?? this.options.ttl;

    if (resolvedTTL === undefined || resolvedTTL === 0) {
      return undefined;
    }

    return resolvedTTL;
  }
}
