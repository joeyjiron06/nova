import type {
  CacheEntry,
  CacheEntryMeta,
  CacheStore,
  SetCacheOptions,
} from "../cache.types";

/**
 * Keeps cache entries in a `Map` inside the current process.
 *
 * Works in every JavaScript runtime and needs no configuration. Values are held
 * by reference, so nothing is serialized and any value is allowed. Everything
 * is lost when the process exits.
 */
export default class MemoryStore implements CacheStore {
  private map: Map<string, CacheEntry<unknown>>;

  constructor() {
    this.map = new Map();
  }

  /** Empties the map. */
  async clear(): Promise<void> {
    this.map.clear();
  }

  /** Writes an entry, replacing any existing entry for the key. */
  async set<V>(
    key: string,
    value: V,
    options?: SetCacheOptions,
  ): Promise<void> {
    this.map.set(key, {
      key,
      value,
      expiresAt: options?.expiresAt,
    });
  }

  /** Reads the stored entry, or `undefined` when the key is not in the map. */
  async get<V>(key: string): Promise<CacheEntry<V> | undefined> {
    const entry = this.map.get(key);

    if (!entry) {
      return undefined;
    }

    return {
      key: entry.key,
      value: entry.value as V,
      expiresAt: entry.expiresAt,
    };
  }

  /** Removes the entry for the key. */
  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  /** Reads metadata for every entry, skipping the values. */
  async meta(): Promise<CacheEntryMeta[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return Array.from(this.map.values()).map(({ value, ...meta }) => meta);
  }

  /** Reads only the metadata for a key, skipping the value. */
  async getMeta(key: string): Promise<CacheEntryMeta | undefined> {
    const entry = this.map.get(key);

    if (!entry) {
      return undefined;
    }

    return {
      key: entry.key,
      expiresAt: entry.expiresAt,
    };
  }
}
