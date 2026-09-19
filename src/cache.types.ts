/**
 * The cache API you interact with. Expiration is handled here, so every
 * {@link CacheStore} behaves the same way no matter where the entries live.
 */
export interface Cache {
  /**
   * Stores a value under the given key.
   *
   * Falls back to the cache default when `ttl` is omitted. A `ttl` of 0 means
   * the entry never expires.
   */
  set<V>(key: string, value: V, ttl?: number): Promise<void>;

  /**
   * Returns the value for the key, or `undefined` when it is missing or expired.
   *
   * Expired entries are deleted as they are read.
   */
  get<V>(key: string): Promise<V | undefined>;

  /**
   * Removes the entry for the key. Does nothing when the key is not cached.
   */
  delete(key: string): Promise<void>;

  /**
   * Returns true when the key is cached and has not expired.
   *
   * Only reads metadata, so the value is never deserialized.
   */
  has(key: string): Promise<boolean>;

  /**
   * Removes every entry from the store.
   */
  clear(): Promise<void>;

  /**
   * Returns metadata for every entry, without reading any values.
   *
   * Expired entries are still listed until something reads or clears them.
   */
  meta(): Promise<CacheEntryMeta[]>;

  /**
   * Changes the default time to live, in milliseconds, for entries written from
   * now on. Existing entries keep the expiry they were written with.
   */
  setDefaultTTL(ttl: number): void;

  /**
   * Returns the cached value for the key, or runs `fn` and caches what it returns.
   *
   * Concurrent calls for the same key share a single run of `fn`.
   */
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

/**
 * Passed to the `Nova` constructor to build a {@link Cache}.
 */
export type CacheOptions = {
  /**
   * Default time to live in milliseconds for each cache entry.
   *
   * Omit it, or use 0, to keep entries until something deletes them.
   */
  ttl?: number;

  /**
   * Where the cache entries are kept.
   */
  store: CacheStore;
};

/**
 * Passed to {@link CacheStore.set}. The cache has already turned a relative TTL
 * into an absolute timestamp by this point.
 */
export type SetCacheOptions = {
  /**
   * Unix timestamp in milliseconds at which the entry expires.
   *
   * When omitted, the entry does not expire.
   */
  expiresAt?: number;
};

/**
 * The storage contract behind a {@link Cache}.
 *
 * A store only reads and writes. It never decides whether an entry has expired,
 * which is why the same expiry rules apply to every store.
 */
export type CacheStore = {
  /**
   * Writes an entry, replacing any existing entry for the key.
   *
   * The absolute expiry is passed in through `options`; the store stores it
   * verbatim and never interprets it.
   */
  set<V>(key: string, value: V, options?: SetCacheOptions): Promise<void>;

  /**
   * Reads the stored entry, or `undefined` when nothing is stored for the key.
   *
   * Returns expired entries as-is. The cache decides what to do with them.
   */
  get<V>(key: string): Promise<CacheEntry<V> | undefined>;

  /**
   * Reads only the metadata for a key, skipping the value.
   */
  getMeta(key: string): Promise<CacheEntryMeta | undefined>;

  /**
   * Removes the entry for the key. Does nothing when the key is not stored.
   */
  delete(key: string): Promise<void>;

  /**
   * Removes every entry from the store.
   */
  clear(): Promise<void>;

  /**
   * Reads metadata for every stored entry, skipping the values.
   */
  meta(): Promise<CacheEntryMeta[]>;
};

/**
 * One stored record: the key, the value, and when it expires.
 */
export type CacheEntry<V> = {
  /**
   * The key the entry was stored under.
   */
  key: string;

  /**
   * The cached value, returned exactly as it was stored.
   */
  value: V;

  /**
   * Unix timestamp in milliseconds at which the entry expires.
   *
   * When omitted, the entry does not expire.
   */
  expiresAt?: number;
};

/**
 * A {@link CacheEntry} without its value.
 *
 * Lets you inspect what is cached, and when it expires, without paying the cost
 * of reading or deserializing the value.
 */
export type CacheEntryMeta = Omit<CacheEntry<unknown>, "value">;

/**
 * Passed to {@link Cache.wrap} to override how that one call is cached.
 */
export type CacheWrapOptions = {
  /**
   * Time to live in milliseconds for the entry this call may write.
   *
   * Overrides the cache default, and is itself overridden by
   * {@link WrapEntry.setTTL}.
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
