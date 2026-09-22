import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import superjson from "superjson";
import type {
  CacheEntry,
  CacheEntryMeta,
  CacheStore,
  SetCacheOptions,
} from "../cache.types";

/** Extension for a finished entry. */
const ENTRY_EXTENSION = ".jsonl";

/** Extension for a half written entry that has not been renamed into place yet. */
const TEMP_EXTENSION = ".tmp";

/** Extension for a superseded entry that is waiting for its readers to finish. */
const DISPLACED_EXTENSION = ".old";

/** Size of each chunk read while looking for the end of the metadata line. */
const READ_CHUNK_SIZE = 4096;

/**
 * Longest metadata line accepted before a file is treated as corrupt.
 *
 * Metadata is only a key and a timestamp, so anything larger means the file is
 * damaged. The cap stops a damaged file from being buffered into memory.
 */
const MAX_META_LINE_BYTES = 1024 * 1024;

/** How many files `meta` reads at once, to stay well under the file handle limit. */
const META_CONCURRENCY = 32;

/**
 * How long to keep retrying a rename before moving the old file aside instead.
 *
 * Windows refuses to replace a file that any process has open, and reports
 * EPERM. A reader usually finishes within a few milliseconds, so retrying
 * clears most conflicts without the fallback below.
 */
const RENAME_RETRY_BUDGET_MS = 250;

/**
 * Upper bound on the pause between rename attempts.
 *
 * The pause is randomised. A fixed pause makes competing writers retry in step
 * with each other, so they keep colliding.
 */
const RENAME_RETRY_MAX_DELAY_MS = 8;

/** How many times to fall back to moving the old file aside before giving up. */
const PUBLISH_ROUNDS = 3;

/**
 * Keeps cache entries as files on disk, so they survive a restart and can be
 * read by any process that can see the directory.
 *
 * Keys are hashed before they touch the filesystem, so any string is a valid
 * key. Values are serialized with superjson, so `Date`, `Map`, `Set` and
 * `undefined` come back as what you put in.
 *
 * Each entry is one file holding two lines, which is what lets `getMeta` and
 * `meta` inspect expiry without reading the value. They stop reading at the
 * first newline:
 *
 * ```text
 * basePath/
 *   <hashedKey>.jsonl
 *       line 1: the key and its expiry
 *       line 2: the cached value
 * ```
 *
 * One file per entry matters for more than tidiness. A pair of files cannot be
 * written as a single step, so two writers racing on one key can leave the
 * expiry of one write attached to the value of another. A single file is
 * written to a temporary name and then renamed into place, and a rename either
 * happens completely or not at all. Readers therefore see the previous entry or
 * the new one, never a mixture, and never a half written file.
 *
 * A newline is a safe separator because superjson serializes through
 * `JSON.stringify`, which escapes every control character. A real newline can
 * only ever be the separator.
 *
 * Node only, because it reads and writes the filesystem.
 */
export default class FileSystemStore implements CacheStore {
  private readonly basePath: string;

  /**
   * @param basePath - Directory the entries are written to. It is created on
   * the first write. `clear` removes the entries inside it, not the directory.
   */
  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Removes every entry this store wrote, along with any temporary files left
   * behind by an interrupted write.
   *
   * Files the store did not create are left alone, so pointing a store at a
   * directory that holds other things stays safe.
   */
  async clear(): Promise<void> {
    const filenames = await this.listDirectory();

    const removable = filenames.filter(
      (filename) =>
        filename.endsWith(ENTRY_EXTENSION) ||
        filename.endsWith(TEMP_EXTENSION) ||
        filename.endsWith(DISPLACED_EXTENSION),
    );

    await Promise.all(
      removable.map((filename) =>
        rm(path.join(this.basePath, filename), { force: true }),
      ),
    );
  }

  /**
   * Reads metadata for every entry, skipping the values.
   *
   * Only the first line of each file is read, so a directory of large values
   * costs no more to list than a directory of small ones.
   *
   * Returns an empty array when the directory does not exist yet. Files that
   * cannot be read are skipped rather than failing the whole listing, because
   * one damaged entry should not hide every healthy one.
   */
  async meta(): Promise<CacheEntryMeta[]> {
    const filenames = await this.listDirectory();
    const entryFiles = filenames.filter((filename) =>
      filename.endsWith(ENTRY_EXTENSION),
    );

    const results = await mapWithConcurrency(
      entryFiles,
      META_CONCURRENCY,
      (filename) => readMetaLine(path.join(this.basePath, filename)),
    );

    return results.filter((entry): entry is CacheEntryMeta => entry !== undefined);
  }

  /**
   * Reads the stored entry, or `undefined` when nothing valid is stored.
   *
   * Reads the whole file once, because both lines are needed. Returns
   * `undefined` when the file is missing, when it is damaged, or when it holds
   * a different key that hashed to the same filename.
   */
  async get<V>(key: string): Promise<CacheEntry<V> | undefined> {
    let contents: string;

    try {
      contents = await readFile(this.pathFor(key), "utf8");
    } catch {
      return undefined;
    }

    const separator = contents.indexOf("\n");

    // No separator means the file was truncated before the value was written.
    if (separator === -1) {
      return undefined;
    }

    const metaLine = contents.slice(0, separator);
    const valueLine = contents.slice(separator + 1);

    // An empty second line is a truncated write, not a stored `undefined`.
    // superjson always produces a non empty string, even for `undefined`.
    if (valueLine.trim() === "") {
      return undefined;
    }

    try {
      const meta = parseMetaLine(metaLine);

      if (meta === undefined || meta.key !== key) {
        return undefined;
      }

      return {
        key: meta.key,
        expiresAt: meta.expiresAt,
        value: superjson.parse<V>(valueLine),
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Reads only the metadata for a key, stopping at the end of the first line.
   *
   * The value is never read, however large it is.
   */
  async getMeta(key: string): Promise<CacheEntryMeta | undefined> {
    const meta = await readMetaLine(this.pathFor(key));

    // A different key can hash to the same filename. Serving its expiry would
    // report the wrong entry as present.
    if (meta === undefined || meta.key !== key) {
      return undefined;
    }

    return meta;
  }

  /** Removes the file for the key. Does nothing when it is not there. */
  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  /**
   * Writes the entry, creating the directory if needed.
   *
   * The entry goes to a uniquely named temporary file first and is then renamed
   * over the target. Readers see the old entry until the rename lands, and the
   * new one immediately after.
   */
  async set<V>(
    key: string,
    value: V,
    options?: SetCacheOptions,
  ): Promise<void> {
    const metaLine = superjson.stringify({
      key,
      expiresAt: options?.expiresAt,
    } satisfies CacheEntryMeta);

    const valueLine = superjson.stringify(value);

    await this.writeAtomically(
      this.pathFor(key),
      `${metaLine}\n${valueLine}\n`,
    );
  }

  /**
   * Returns the absolute path of the file backing a key.
   *
   * Exposed so you can find, inspect or back up an entry on disk. The file may
   * not exist.
   */
  pathFor(key: string): string {
    // Called through the class rather than directly so that the hash can be
    // replaced in tests, and so subclasses can change the layout.
    const safeKey = FileSystemStore.hashKey(key);
    return path.join(this.basePath, `${safeKey}${ENTRY_EXTENSION}`);
  }

  /**
   * Hashes a cache key into a filename-safe string.
   *
   * Exposed so you can locate the file for a key on disk.
   */
  static hashKey(key: string): string {
    const hash = crypto.createHash("md5");
    const data = hash.update(key, "utf-8");
    return data.digest("hex");
  }

  /** Lists the base directory, treating a missing directory as empty. */
  private async listDirectory(): Promise<string[]> {
    try {
      return await readdir(this.basePath);
    } catch {
      return [];
    }
  }

  private async writeAtomically(target: string, contents: string): Promise<void> {
    await mkdir(this.basePath, { recursive: true });

    // The temporary file must sit beside the target. A rename across
    // filesystems fails with EXDEV, and a shared name would let two writers
    // overwrite each other's temporary file.
    const temp = `${target}.${process.pid}.${crypto.randomUUID()}${TEMP_EXTENSION}`;

    try {
      await writeFile(temp, contents, "utf8");
      await publish(temp, target);
    } catch (error) {
      await removeQuietly(temp);
      throw error;
    }
  }
}

/**
 * Moves a finished temporary file over the entry it replaces.
 *
 * On Linux and macOS the first rename always succeeds and nothing else runs.
 *
 * Windows is the awkward one. It refuses to replace a file that any process has
 * open, even for reading, and fails the rename with EPERM. Retrying clears a
 * brief overlap, but a busy key can stay open almost continuously, so retrying
 * alone can block a writer for seconds.
 *
 * Windows does allow two things that get us out of it: an open file can be
 * renamed somewhere else, and an open file can be deleted. So once the retry
 * budget runs out, the entry being replaced is moved aside and deleted, which
 * leaves the target free. Readers already holding the old file keep reading it
 * to the end.
 */
async function publish(temp: string, target: string): Promise<void> {
  for (let round = 0; round < PUBLISH_ROUNDS; round++) {
    if (await renameWithinBudget(temp, target)) {
      return;
    }

    await displace(target);
  }

  // Out of fallbacks. Let the underlying error reach the caller.
  await rename(temp, target);
}

/**
 * Retries a rename until it succeeds or the budget runs out.
 *
 * Returns false when the budget ran out, rather than throwing, because the
 * caller has another approach to try.
 */
async function renameWithinBudget(
  from: string,
  to: string,
): Promise<boolean> {
  const deadline = Date.now() + RENAME_RETRY_BUDGET_MS;

  for (;;) {
    try {
      await rename(from, to);
      return true;
    } catch (error) {
      if (!isDestinationBusy(error)) {
        throw error;
      }

      if (Date.now() >= deadline) {
        return false;
      }

      await delay(Math.random() * RENAME_RETRY_MAX_DELAY_MS);
    }
  }
}

/**
 * Frees a path by moving whatever is there out of the way and deleting it.
 *
 * The move and the delete both work on a file that is currently open, which is
 * the whole reason this exists.
 */
async function displace(target: string): Promise<void> {
  const displaced = `${target}.${crypto.randomUUID()}${DISPLACED_EXTENSION}`;

  try {
    await rename(target, displaced);
  } catch (error) {
    // Already gone, which is the state we were trying to reach.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }

  await removeQuietly(displaced);
}

/**
 * Deletes a file and ignores any failure.
 *
 * Used for cleanup that runs while another error is already on its way to the
 * caller. A leftover file is untidy; hiding the real problem behind a tidying
 * failure is worse.
 */
async function removeQuietly(target: string): Promise<void> {
  try {
    await rm(target, { force: true });
  } catch {
    // Nothing useful to do. [H[2J[3J sweeps up whatever is left behind.
  }
}

/** True for the errors Windows raises when the destination is held open. */
function isDestinationBusy(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  return code === "EPERM" || code === "EBUSY" || code === "EACCES";
}

/**
 * Reads and parses the metadata line of an entry file.
 *
 * Returns `undefined` for a missing, empty, damaged or truncated file, because
 * every one of those is a cache miss rather than an error the caller can act
 * on.
 */
async function readMetaLine(
  filePath: string,
): Promise<CacheEntryMeta | undefined> {
  const line = await readFirstLine(filePath);

  if (line === undefined) {
    return undefined;
  }

  return parseMetaLine(line);
}

function parseMetaLine(line: string): CacheEntryMeta | undefined {
  try {
    const meta = superjson.parse<CacheEntryMeta>(line);

    // A file can parse as valid JSON without being one of ours.
    if (typeof meta?.key !== "string") {
      return undefined;
    }

    return meta;
  } catch {
    return undefined;
  }
}

/**
 * Streams a file only as far as its first newline.
 *
 * Returns `undefined` when the file is missing, unreadable, or has no newline.
 * A file with no newline is a write that was interrupted before the value was
 * written, so treating its first line as valid metadata would make `getMeta`
 * report an entry that `get` cannot return.
 *
 * Every read failure becomes a miss rather than an error, which is what `get`
 * does too. A cache that reports a miss keeps the caller working; a cache that
 * throws takes the caller down with it.
 */
function readFirstLine(filePath: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const stream = createReadStream(filePath, {
      encoding: "utf8",
      highWaterMark: READ_CHUNK_SIZE,
    });

    let line = "";

    // `encoding` is set, so chunks arrive already decoded as strings, and a
    // character split across two chunks is rejoined for us.
    stream.on("data", (chunk: string) => {
      const newlineIndex = chunk.indexOf("\n");

      if (newlineIndex !== -1) {
        line += chunk.slice(0, newlineIndex);
        stream.destroy();
        resolve(stripCarriageReturn(line));
        return;
      }

      line += chunk;

      // A file of ours always breaks within the first chunk or two. Anything
      // longer is damaged, and buffering it would be pointless and expensive.
      if (line.length > MAX_META_LINE_BYTES) {
        stream.destroy();
        resolve(undefined);
      }
    });

    stream.on("end", () => resolve(undefined));
    stream.on("error", () => resolve(undefined));
  });
}

/** Tolerates a file written with Windows line endings by another tool. */
function stripCarriageReturn(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs an async function over a list with a ceiling on how many run at once.
 *
 * `Promise.all` over a whole directory opens every file at the same time, which
 * exhausts the process file handle limit and fails with EMFILE once a cache
 * grows past a few thousand entries.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    },
  );

  await Promise.all(workers);

  return results;
}
