import crypto from "crypto";
import { outputFile, remove, pathExists } from "fs-extra/esm";
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
 * Keeps cache entries as files on disk, so they survive a restart and can be
 * read by any process that can see the directory.
 *
 * Keys are hashed before they touch the filesystem, so any string is a valid
 * key. Values are serialized with superjson, so `Date`, `Map`, `Set` and
 * `undefined` come back as what you put in.
 *
 * Each entry is written as two files, which is what lets `getMeta` and `meta`
 * inspect expiry without reading the value:
 *
 * ```text
 * basePath/
 *   <hashedKey>.value.json   the cached value
 *   <hashedKey>.meta.json    the key and its expiry
 * ```
 *
 * Node only, because it reads and writes the filesystem.
 */
export default class FileSystemStore implements CacheStore {
  private readonly basePath: string;

  /**
   * @param basePath - Directory the entries are written to. It is created on
   * the first write, and removed entirely by `clear`.
   */
  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /** Removes the whole base directory. */
  clear(): Promise<void> {
    return remove(this.basePath);
  }

  /**
   * Reads metadata for every entry, skipping the values.
   *
   * Returns an empty array when the directory does not exist yet.
   */
  async meta(): Promise<CacheEntryMeta[]> {
    const dirExists = await pathExists(this.basePath);

    if (!dirExists) {
      return [];
    }

    const allFiles = await readdir(this.basePath);
    const metaFiles = allFiles.filter((file) => file.endsWith(".meta.json"));

    return Promise.all(
      metaFiles.map(async (filename) => {
        const buffer = await readFile(path.join(this.basePath, filename));
        return superjson.parse<CacheEntryMeta>(buffer.toString());
      }),
    );
  }

  /**
   * Reads the stored entry, or `undefined` when either file is missing.
   */
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

  /** Reads only the metadata file for a key, skipping the value file. */
  async getMeta(key: string): Promise<CacheEntryMeta | undefined> {
    try {
      const paths = this.getPaths(key);
      const buffer = await readFile(paths.meta);
      return superjson.parse<CacheEntryMeta>(buffer.toString());
    } catch {
      return undefined;
    }
  }

  /** Removes both files for the key. */
  async delete(key: string): Promise<void> {
    const paths = this.getPaths(key);

    await Promise.all([remove(paths.meta), remove(paths.value)]);
  }

  /** Writes the value and metadata files, creating the directory if needed. */
  async set<V>(
    key: string,
    value: V,
    options?: SetCacheOptions,
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
    const safeKey = FileSystemStore.hashKey(key);
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

  /**
   * Hashes a cache key into a filename-safe string.
   *
   * Exposed so you can locate the files for a key on disk.
   */
  static hashKey(key: string): string {
    const hash = crypto.createHash("md5");
    const data = hash.update(key, "utf-8");
    return data.digest("hex");
  }
}
