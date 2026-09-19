import type {
  CacheEntryMeta,
  CacheOptions,
  CacheStore,
  CacheWrapOptions,
  Cache,
  WrapEntry,
} from "./cache.types";

export class Nova implements Cache {
  private readonly store: CacheStore;
  private readonly options: CacheOptions;

  /**
   * Calls to `wrap` that are still running, keyed by cache key.
   *
   * Deduplication lives here rather than in a store so that every store gets it
   * for free. It is scoped to this instance, so two Nova instances sharing one
   * store will not collapse each other's calls.
   */
  private readonly inFlight: Map<string, Promise<unknown>>;

  constructor(options: CacheOptions) {
    this.options = options;
    this.store = options.store;
    this.inFlight = new Map();
  }

  setDefaultTTL(ttl: number): void {
    this.options.ttl = ttl;
  }

  /**
   * Returns the value for the given key, or undefined if it is missing or expired.
   *
   * If a `wrap` call is in flight for this key, its result is returned rather than
   * the stored value, because the stored value is by definition out of date. A
   * failing `wrap` never makes `get` throw; it falls through to the store instead.
   */
  async get<V>(key: string): Promise<V | undefined> {
    const inFlight = this.inFlight.get(key);

    if (inFlight) {
      try {
        return (await inFlight) as V;
      } catch {
        // `get` has no error contract, so a failing `wrap` must not surface here.
      }
    }

    return this.readFromStore<V>(key);
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

  /**
   * Returns the cached value for the key, or runs `fn` and caches what it returns.
   *
   * Concurrent calls for the same key share a single run of `fn`, including calls
   * passing `forceRefresh`: a refresh that is already running is the refresh they
   * asked for. `disableCache` opts out of all of it.
   */
  async wrap<V>(
    key: string,
    fn: (entry: WrapEntry) => Promise<V>,
    options?: CacheWrapOptions,
  ): Promise<V> {
    if (options?.disableCache) {
      // Nothing is stored, so setTTL has nothing to act on.
      return fn({ setTTL: () => {} });
    }

    const inFlight = this.inFlight.get(key);

    if (inFlight) {
      return inFlight as Promise<V>;
    }

    // Nothing may be awaited between the lookup above and the registration below,
    // or two concurrent misses both pass the lookup before either one registers.
    const pending = this.resolve<V>(key, fn, options);

    this.inFlight.set(key, pending);

    try {
      return await pending;
    } finally {
      this.inFlight.delete(key);
    }
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

  private async resolve<V>(
    key: string,
    fn: (entry: WrapEntry) => Promise<V>,
    options?: CacheWrapOptions,
  ): Promise<V> {
    if (!options?.forceRefresh) {
      // Reads the store directly. Going through `get` would consult the in-flight
      // map, which is about to hold this very call.
      const cachedValue = await this.readFromStore<V>(key);

      if (cachedValue !== undefined) {
        return cachedValue;
      }
    }

    let ttl: number | undefined;

    const entry: WrapEntry = {
      setTTL: (value: number) => {
        ttl = value;
      },
    };

    const result = await fn(entry);

    await this.set<V>(key, result, ttl ?? options?.ttl);

    return result;
  }

  private async readFromStore<V>(key: string): Promise<V | undefined> {
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
