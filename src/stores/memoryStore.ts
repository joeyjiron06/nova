import type {
  CacheEntry,
  CacheEntryMeta,
  CacheStore,
  SetCacheOptions,
} from "../cache.types";

export default class MemoryStore implements CacheStore {
  private map: Map<string, CacheEntry<unknown>>;

  constructor() {
    this.map = new Map();
  }

  async clear(): Promise<void> {
    this.map.clear();
  }

  async set<V>(
    key: string,
    value: V,
    options?: SetCacheOptions
  ): Promise<void> {
    this.map.set(key, {
      key,
      value,
      expiresAt: options?.expiresAt,
    });
  }

  async get<V>(key: string): Promise<CacheEntry<V> | undefined> {
    // @ts-expect-error - Type casting issue
    return this.map.get(key);
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
}
