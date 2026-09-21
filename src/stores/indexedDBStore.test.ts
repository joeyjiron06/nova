import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import IndexedDBStore from "./indexedDBStore";

/**
 * `fake-indexeddb/auto` installs one `indexedDB` shared by the whole file, so
 * every test gets its own database rather than relying on a cleanup step.
 */
let databaseCount = 0;

const openStores: IndexedDBStore[] = [];

function uniqueDatabaseName(): string {
  databaseCount += 1;
  return `nova-test-${databaseCount}`;
}

function createStore(databaseName: string = uniqueDatabaseName()) {
  const store = new IndexedDBStore(databaseName);

  openStores.push(store);

  return store;
}

/** Opens a connection the store does not own, standing in for another tab. */
function openDatabase(
  databaseName: string,
  version: number,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Races a promise against a timer, so a blocked request fails instead of hanging. */
async function settleWithin<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | "timed out"> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<"timed out">((resolve) => {
    timer = setTimeout(() => resolve("timed out"), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

afterEach(async () => {
  vi.restoreAllMocks();

  await Promise.all(openStores.splice(0).map((store) => store.close()));
});

describe("IndexedDBStore", () => {
  it("should keep Date, Map and Set intact, because values are cloned not serialized", async () => {
    const store = createStore();

    const value = {
      generatedAt: new Date("2023-12-25T10:30:00.000Z"),
      totals: new Map([["q1", 1200]]),
      seen: new Set(["q1"]),
    };

    await store.set("report", value);

    const entry = await store.get<typeof value>("report");

    expect(entry?.value.generatedAt).toBeInstanceOf(Date);
    expect(entry?.value.totals).toBeInstanceOf(Map);
    expect(entry?.value.seen).toBeInstanceOf(Set);
    expect(entry).toEqual({ key: "report", value, expiresAt: undefined });
  });

  it("should return undefined for a key that was never written", async () => {
    const store = createStore();

    expect(await store.get("missing")).toBeUndefined();
    expect(await store.getMeta("missing")).toBeUndefined();
    expect(await store.meta()).toEqual([]);
  });

  it("should store the expiry alongside the key", async () => {
    const store = createStore();

    await store.set("a", "value", { expiresAt: 1234 });
    await store.set("b", "value");

    expect(await store.get("a")).toEqual({
      key: "a",
      value: "value",
      expiresAt: 1234,
    });
    expect(await store.getMeta("a")).toEqual({ key: "a", expiresAt: 1234 });
    expect(await store.meta()).toEqual([
      { key: "a", expiresAt: 1234 },
      { key: "b", expiresAt: undefined },
    ]);
  });

  it("should replace an entry written under the same key", async () => {
    const store = createStore();

    await store.set("a", "first", { expiresAt: 1234 });
    await store.set("a", "second");

    expect(await store.get("a")).toEqual({
      key: "a",
      value: "second",
      expiresAt: undefined,
    });
    expect(await store.meta()).toHaveLength(1);
  });

  it("should remove both the value and the metadata on delete", async () => {
    const store = createStore();

    await store.set("a", "value");
    await store.delete("a");

    expect(await store.get("a")).toBeUndefined();
    expect(await store.getMeta("a")).toBeUndefined();
  });

  it("should do nothing when deleting a key that is not stored", async () => {
    const store = createStore();

    await expect(store.delete("missing")).resolves.toBeUndefined();
  });

  it("should empty both object stores on clear", async () => {
    const store = createStore();

    await store.set("a", "value");
    await store.set("b", "value");
    await store.clear();

    expect(await store.get("a")).toBeUndefined();
    expect(await store.meta()).toEqual([]);

    // The database itself is still usable, because clear does not delete it.
    await store.set("c", "value");
    expect(await store.meta()).toEqual([{ key: "c", expiresAt: undefined }]);
  });

  it("should clear a database that was never opened", async () => {
    await expect(createStore().clear()).resolves.toBeUndefined();
  });

  it("should read a stored undefined back as a miss, while keeping its metadata", async () => {
    const store = createStore();

    await store.set("a", undefined);

    expect(await store.get("a")).toBeUndefined();
    expect(await store.getMeta("a")).toEqual({ key: "a", expiresAt: undefined });
  });

  it("should keep entries in separate databases apart", async () => {
    const first = createStore();
    const second = createStore();

    await first.set("key", "first");
    await second.set("key", "second");

    expect((await first.get("key"))?.value).toBe("first");
    expect((await second.get("key"))?.value).toBe("second");
  });

  it("should use the nova-cache database by default", async () => {
    const store = new IndexedDBStore();

    openStores.push(store);

    await store.clear();
    await store.set("a", "value");

    const database = await openDatabase("nova-cache", 1);
    const transaction = database.transaction("values", "readonly");
    const request = transaction.objectStore("values").get("a");

    await new Promise((resolve) => (transaction.oncomplete = resolve));

    expect(request.result).toBe("value");

    database.close();
    await store.clear();
  });

  it("should reject, and write nothing, when a value cannot be cloned", async () => {
    const store = createStore();

    await expect(store.set("fn", () => "not cloneable")).rejects.toThrow();

    expect(await store.get("fn")).toBeUndefined();
    expect(await store.meta()).toEqual([]);
  });

  it("should reject when the transaction is rolled back", async () => {
    const store = createStore();

    await store.set("a", "value");

    const put = IDBObjectStore.prototype.put;

    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      const request = put.call(this, value, key);

      // Both requests have been issued by the time the metadata is written, so
      // aborting here is what a denied quota looks like at commit time.
      if (this.name === "meta") {
        this.transaction.abort();
      }

      return request;
    });

    await expect(store.set("b", "value")).rejects.toThrow(/aborted/i);

    vi.restoreAllMocks();

    expect(await store.get("b")).toBeUndefined();
    expect((await store.get("a"))?.value).toBe("value");
  });

  it("should reject when the database is at a newer version", async () => {
    const databaseName = uniqueDatabaseName();
    const otherTab = await openDatabase(databaseName, 2);

    const store = createStore(databaseName);
    const error = await store.get("a").catch((reason: unknown) => reason);

    expect((error as DOMException).name).toBe("VersionError");

    otherTab.close();
  });

  it("should reopen the connection after it is closed", async () => {
    const store = createStore();

    await store.set("a", "value");
    await store.close();

    expect((await store.get("a"))?.value).toBe("value");
  });

  it("should do nothing when closing a store that was never opened", async () => {
    await expect(createStore().close()).resolves.toBeUndefined();
  });

  it("should not throw when closing while an open is failing", async () => {
    const databaseName = uniqueDatabaseName();
    const otherTab = await openDatabase(databaseName, 2);

    const store = createStore(databaseName);

    // Starts an open that is going to fail, and does not wait for it.
    const pending = store.get("a").catch(() => undefined);

    await expect(store.close()).resolves.toBeUndefined();
    await pending;

    otherTab.close();
  });

  it("should close its connection when another tab upgrades the database", async () => {
    const databaseName = uniqueDatabaseName();
    const store = createStore(databaseName);

    await store.set("a", "value");

    let blocked = false;

    const upgrade = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onblocked = () => (blocked = true);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const upgraded = await settleWithin(upgrade, 500);

    expect(blocked).toBe(false);
    expect(upgraded).not.toBe("timed out");

    (upgraded as IDBDatabase).close();
  });
});
