import type {
  CacheEntry,
  CacheEntryMeta,
  CacheStore,
  SetCacheOptions,
} from "../cache.types";

/** Object store holding the cached values, keyed by the cache key. */
const VALUES_STORE = "values";

/** Object store holding {@link CacheEntryMeta} records, keyed by their `key`. */
const META_STORE = "meta";

/**
 * Schema version, which never changes.
 *
 * That is why {@link IndexedDBStore} never handles `blocked`: it only fires when
 * an open request has to upgrade the database, and a fixed version never
 * upgrades. Bump this and you have to handle `blocked` too, or the first call
 * hangs for as long as another tab keeps the old version open.
 */
const VERSION = 1;

const DEFAULT_DATABASE_NAME = "nova-cache";

/**
 * Keeps cache entries in IndexedDB, so they survive a reload and are shared by
 * every tab on the origin.
 *
 * Nothing is serialized. IndexedDB stores values with the structured clone
 * algorithm, so `Date`, `Map`, `Set` and circular references come back as what
 * you put in. Functions, symbols and DOM nodes still cannot be stored, and class
 * instances lose their prototype.
 *
 * Each entry is written to two object stores, which is what lets `getMeta` and
 * `meta` inspect expiry without cloning the value:
 *
 * ```text
 * nova-cache (version 1)
 *   values   the cached value, keyed by the cache key
 *   meta     { key, expiresAt }, keyed by "key"
 * ```
 *
 * Browser only, because it reads the global `indexedDB`.
 */
export default class IndexedDBStore implements CacheStore {
  private readonly databaseName: string;

  /**
   * The open connection, memoised so concurrent calls share one `open` request.
   *
   * Cleared whenever the connection goes away, so the next call reopens.
   */
  private connection: Promise<IDBDatabase> | undefined;

  /**
   * @param databaseName - Database the entries are written to. It is created on
   * first use, and emptied by `clear()`.
   */
  constructor(databaseName: string = DEFAULT_DATABASE_NAME) {
    this.databaseName = databaseName;
  }

  /** Writes the value and its metadata in one transaction. */
  async set<V>(
    key: string,
    value: V,
    options?: SetCacheOptions,
  ): Promise<void> {
    await this.run("readwrite", (transaction) => {
      transaction.objectStore(VALUES_STORE).put(value, key);
      transaction.objectStore(META_STORE).put({
        key,
        expiresAt: options?.expiresAt,
      } satisfies CacheEntryMeta);
    });
  }

  /**
   * Reads the stored entry, or `undefined` when nothing is stored for the key.
   *
   * A stored `undefined` cannot be told apart from a miss, the same way it
   * cannot in `FileSystemStore`.
   */
  async get<V>(key: string): Promise<CacheEntry<V> | undefined> {
    const [metaRequest, valueRequest] = await this.run(
      "readonly",
      (transaction) => [
        transaction.objectStore(META_STORE).get(key),
        transaction.objectStore(VALUES_STORE).get(key),
      ],
    );

    const meta = metaRequest.result as CacheEntryMeta | undefined;
    const value = valueRequest.result as V | undefined;

    if (!meta || value === undefined) {
      return undefined;
    }

    return {
      key: meta.key,
      value,
      expiresAt: meta.expiresAt,
    };
  }

  /** Reads only the metadata for a key, so the value is never cloned. */
  async getMeta(key: string): Promise<CacheEntryMeta | undefined> {
    const request = await this.run("readonly", (transaction) =>
      transaction.objectStore(META_STORE).get(key),
    );

    return request.result as CacheEntryMeta | undefined;
  }

  /** Reads metadata for every entry, so no value is cloned. */
  async meta(): Promise<CacheEntryMeta[]> {
    const request = await this.run("readonly", (transaction) =>
      transaction.objectStore(META_STORE).getAll(),
    );

    return request.result as CacheEntryMeta[];
  }

  /** Removes the value and its metadata in one transaction. */
  async delete(key: string): Promise<void> {
    await this.run("readwrite", (transaction) => {
      transaction.objectStore(VALUES_STORE).delete(key);
      transaction.objectStore(META_STORE).delete(key);
    });
  }

  /**
   * Empties both object stores, leaving the database in place.
   *
   * Deleting the database instead would block, with no timeout, for as long as
   * any other tab keeps a connection open.
   */
  async clear(): Promise<void> {
    await this.run("readwrite", (transaction) => {
      transaction.objectStore(VALUES_STORE).clear();
      transaction.objectStore(META_STORE).clear();
    });
  }

  /**
   * Closes the connection. The next read or write opens a new one.
   *
   * Nothing has to call this. It is here for teardown, so a test or a page
   * leaving the screen can release the connection on purpose.
   */
  async close(): Promise<void> {
    const connection = this.connection;

    if (!connection) {
      return;
    }

    this.connection = undefined;

    try {
      // Awaiting means an open still in flight is closed once it lands, rather
      // than leaking a connection nobody holds a reference to.
      const database = await connection;
      database.close();
    } catch {
      // The connection never opened, so there is nothing to close.
    }
  }

  /**
   * Runs one transaction across both object stores and waits for it to commit.
   *
   * `operation` must issue every request synchronously. A transaction goes
   * inactive as soon as control returns to the event loop, so an `await` in the
   * middle of one makes the next request throw.
   */
  private async run<T>(
    mode: IDBTransactionMode,
    operation: (transaction: IDBTransaction) => T,
  ): Promise<T> {
    const database = await this.open();
    const transaction = database.transaction([VALUES_STORE, META_STORE], mode);

    let result: T;

    try {
      result = operation(transaction);
    } catch (error) {
      // A value that cannot be cloned throws here, after a sibling request may
      // already have succeeded. Aborting keeps the write all or nothing.
      transaction.abort();
      throw error;
    }

    await completion(transaction);

    return result;
  }

  /** Returns the open connection, opening one on first use. */
  private open(): Promise<IDBDatabase> {
    this.connection ??= this.connect();

    return this.connection;
  }

  private async connect(): Promise<IDBDatabase> {
    const request = indexedDB.open(this.databaseName, VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      database.createObjectStore(VALUES_STORE);
      database.createObjectStore(META_STORE, {
        keyPath: "key" satisfies keyof CacheEntryMeta,
      });
    };

    try {
      const database = await promisify(request);

      // Another tab is upgrading the database. Holding this connection open
      // would block it indefinitely, so step aside and reopen on the next call.
      database.onversionchange = () => {
        database.close();
        this.connection = undefined;
      };

      return database;
    } catch (error) {
      // A failure is not memoised, so the next call gets a fresh attempt.
      this.connection = undefined;
      throw error;
    }
  }
}

/** Resolves with the request's result, or rejects with the reason it failed. */
function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Resolves once the transaction commits, so a write that is rolled back rejects. */
function completion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();

    // A request error that nothing handles aborts the transaction, so this
    // covers a failed request as well as an abort by the browser, such as a
    // denied quota. `transaction.error` is null for a deliberate abort, which is
    // why the reason is wrapped rather than rethrown.
    transaction.onabort = () =>
      reject(
        new Error(`Transaction on "${transaction.db.name}" was aborted`, {
          cause: transaction.error,
        }),
      );
  });
}
