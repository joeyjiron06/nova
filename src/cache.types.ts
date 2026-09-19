export interface Cache {
  set<V>(key: string, value: V, ttl?: number): Promise<void>;
  get<V>(key: string): Promise<V | undefined>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  meta(): Promise<CacheEntryMeta[]>;
  setDefaultTTL(ttl: number): void;
  wrap<V>(
    key: string,
    fn: (entry: WrapEntry) => Promise<V>,
    options?: CacheWrapOptions,
  ): Promise<V>;
}

/**
 * Handed to the function passed to `wrap` so it can decide the TTL of the entry
 * it is about to create, once it knows what that TTL should be.
 */
export type WrapEntry = {
  /**
   * Sets the time to live in milliseconds for the entry about to be stored.
   *
   * Takes precedence over the `ttl` passed to `wrap` and over the cache default.
   * The last call wins. A ttl of 0 means the entry never expires.
   *
   * Does nothing when `wrap` was called with `disableCache`, because nothing is stored.
   */
  setTTL(ttl: number): void;
};

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

export type CacheEntryMeta = Omit<CacheEntry<unknown>, "value">;

export type CacheWrapOptions = {
  /**
   * Time to live in milliseconds for each cache entry
   */
  ttl?: number;

  /**
   * When true, disables caching for this specific call and always invokes the wrapped function.
   */
  disableCache?: boolean;

  /**
   * When true, forces a refresh of the cache by invoking the wrapped function and updating the cache entry.
   * When false, returns the cached value if it exists and is valid, otherwise invokes the wrapped function.
   */
  forceRefresh?: boolean;
};
