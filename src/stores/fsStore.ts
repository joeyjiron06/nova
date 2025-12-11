import crypto from "crypto";
import { outputFile, remove } from "fs-extra/esm";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import superjson from "superjson";
import type {
  CacheEntry,
  CacheEntryMeta,
  CacheStore,
  SetCacheOptions,
} from "../cache.types";

/**
 * Filesystem-based cache store implementation which stores cache entries as files in the base path.
 * The directory looks like the following:
 *
 * /basePath
 *  /key1.value.json   <-- contains the cached value
 *  /key1.meta.json    <-- contains metadata like expiration time. useful for inspecting cache entries without loading the value
 */
export default class FsCacheStore implements CacheStore {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  clear(): Promise<void> {
    return remove(this.basePath);
  }

  async meta(): Promise<CacheEntryMeta[]> {
    const allFiles = await readdir(this.basePath);
    const metaFiles = allFiles.filter((file) => file.endsWith(".meta.json"));

    return Promise.all(
      metaFiles.map(async (filename) => {
        const buffer = await readFile(path.join(this.basePath, filename));
        return superjson.parse<CacheEntryMeta>(buffer.toString());
      })
    );
  }

  async get<V>(key: string): Promise<CacheEntry<V> | undefined> {
    const [meta, value] = await Promise.all([
      this.getMeta(key),
      this.getValue<V>(key),
    ]);

    if (!meta || value === undefined) {
      return undefined;
    }

    return {
      key: meta.key,
      expiresAt: meta.expiresAt,
      value,
    };
  }

  async getMeta(key: string): Promise<CacheEntryMeta | undefined> {
    try {
      const paths = this.getPaths(key);
      const buffer = await readFile(paths.meta);
      return superjson.parse<CacheEntryMeta>(buffer.toString());
    } catch {
      return undefined;
    }
  }

  async delete(key: string): Promise<void> {
    const paths = this.getPaths(key);

    await Promise.all([remove(paths.meta), remove(paths.value)]);
  }

  async set<V>(
    key: string,
    value: V,
    options?: SetCacheOptions
  ): Promise<void> {
    const paths = this.getPaths(key);

    const meta = superjson.stringify({
      key,
      expiresAt: options?.expiresAt,
    } satisfies CacheEntryMeta);

    const data = superjson.stringify(value);

    await Promise.all([
      outputFile(paths.value, data),
      outputFile(paths.meta, meta),
    ]);
  }

  private getPaths(key: string): { value: string; meta: string } {
    const safeKey = FsCacheStore.hashKey(key);
    return {
      value: path.join(this.basePath, `${safeKey}.value.json`),
      meta: path.join(this.basePath, `${safeKey}.meta.json`),
    };
  }

  private async getValue<V>(key: string): Promise<V | undefined> {
    try {
      const paths = this.getPaths(key);
      const buffer = await readFile(paths.value);
      return superjson.parse<V>(buffer.toString());
    } catch {
      return undefined;
    }
  }

  static hashKey(key: string): string {
    const hash = crypto.createHash("md5");
    const data = hash.update(key, "utf-8");
    return data.digest("hex");
  }
}
