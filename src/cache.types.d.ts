export type CacheOptions = {
  /**
   * Time to live in milliseconds for each cache entry
   */
  ttl?: number;

  /**
   * Storage for the cache entries
   */
  store: CacheStore;
};

export type SetCacheOptions = {
  /**
   * If no expiresAt is set, the entry does not expire, otherwise the entry expires at the given time
   */
  expiresAt?: number;
};

export type CacheStore = {
  set<V>(key: string, value: V, options?: SetCacheOptions): Promise<void>;
  get<V>(key: string): Promise<CacheEntry<V> | undefined>;
  getMeta(key: string): Promise<CacheEntryMeta | undefined>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  meta(): Promise<CacheEntryMeta[]>;
};

export type CacheEntry<V> = {
  /**
   * The cache key
   */
  key: string;

  /**
   * The cached value
   */
  value: V;

  /**
   * If no expiresAt is set, the entry does not expire
   */
  expiresAt?: number;
};

export type CacheEntryMeta = Omit<CacheEntry, "value">;

export type CacheWrapOptions = {
  /**
   * Time to live in milliseconds for each cache entry
   */
  ttl?: number;
  disableCache?: boolean;
};
