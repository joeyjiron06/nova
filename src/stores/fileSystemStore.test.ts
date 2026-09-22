import {
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FileSystemStore from "./fileSystemStore";

/**
 * Store level tests for the on disk layout.
 *
 * `src/index.test.ts` already covers the behaviour every store shares. These
 * tests cover what only a filesystem store can get wrong: partial writes,
 * two concurrent writers landing on one key, and one bad file taking down a
 * whole directory listing.
 *
 * They talk to the store directly rather than through `Nova`, because `Nova`
 * hides the meta and value split behind its own expiry handling.
 */

let dir: string;
let store: FileSystemStore;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "nova-fs-store-"));
  store = new FileSystemStore(dir);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Counts files the store itself created, ignoring anything a test planted. */
async function storeFiles(): Promise<string[]> {
  const entries = await readdir(dir);
  return entries.filter((name) => !name.startsWith("sentinel"));
}

describe("FileSystemStore layout", () => {
  it("writes one file per entry", async () => {
    await store.set("key", "value");

    // Two files per entry cannot be written atomically, so meta and value can
    // always drift apart. One file per entry makes that impossible.
    expect(await storeFiles()).toHaveLength(1);
  });

  it("keeps the whole entry on a single line pair", async () => {
    await store.set("key", { hello: "world" });

    const [name] = await storeFiles();
    const contents = await readFile(path.join(dir, name), "utf8");
    const lines = contents.split("\n").filter((line) => line !== "");

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toMatchObject({ json: { key: "key" } });
  });

  it("does not leave temporary files behind", async () => {
    await store.set("key", "value");

    const leftovers = (await storeFiles()).filter((name) =>
      name.endsWith(".tmp"),
    );
    expect(leftovers).toEqual([]);
  });
});

describe("FileSystemStore concurrency", () => {
  it("keeps meta and value from the same write", async () => {
    const key = "skew";
    const padding = "x".repeat(1024 * 1024);

    // A slow writer and a fast writer race. If meta and value are written as
    // two independent files, the loser's meta can end up paired with the
    // winner's value.
    for (let round = 0; round < 20; round++) {
      await Promise.all([
        store.set(key, { id: 1, padding }, { expiresAt: 1000 }),
        store.set(key, { id: 2, padding: "" }, { expiresAt: 2000 }),
      ]);

      const entry = await store.get<{ id: number }>(key);

      expect(entry).toBeDefined();
      expect(entry?.expiresAt).toBe(entry!.value.id * 1000);
    }
  });

  it("never reports a miss while the same key is being rewritten", async () => {
    const key = "hot";
    const value = "x".repeat(512 * 1024);

    await store.set(key, value);

    let stop = false;
    const writer = (async () => {
      while (!stop) {
        await store.set(key, value);
      }
    })();

    const misses: number[] = [];
    for (let attempt = 0; attempt < 200; attempt++) {
      if ((await store.get(key)) === undefined) {
        misses.push(attempt);
      }
    }

    stop = true;
    await writer;

    expect(misses).toEqual([]);
  });

  it("reads missing keys in parallel without slowing down", async () => {
    const start = Date.now();

    await Promise.all(
      Array.from({ length: 100 }, (_, i) => store.get(`missing-${i}`)),
    );

    // Guards against a future fix that takes a lock on the read path.
    expect(Date.now() - start).toBeLessThan(500);
  });

  it("replaces an entry that another handle holds open", async () => {
    const key = "held";
    await store.set(key, "first");

    // Windows refuses to rename over a file that anything has open. Holding a
    // handle for the whole write is the worst case, and it must still land.
    const handle = await open(store.pathFor(key), "r");

    try {
      await expect(store.set(key, "second")).resolves.toBeUndefined();
    } finally {
      await handle.close();
    }

    expect(await store.get(key)).toMatchObject({ value: "second" });
  });

  it("cleans up after replacing an entry that was held open", async () => {
    const key = "held";
    await store.set(key, "first");

    const handle = await open(store.pathFor(key), "r");
    try {
      await store.set(key, "second");
    } finally {
      await handle.close();
    }

    // Exactly one file, so neither the temporary nor the displaced copy is left
    // lying around to leak disk space on a hot key.
    expect(await storeFiles()).toHaveLength(1);
  });
});

describe("FileSystemStore resilience", () => {
  /** Replaces the file backing a key with arbitrary bytes. */
  async function corrupt(key: string, contents: string): Promise<void> {
    await writeFile(store.pathFor(key), contents);
  }

  it("skips unreadable files instead of rejecting meta", async () => {
    await store.set("a", "value a");
    await store.set("b", "value b");

    for (const name of await storeFiles()) {
      await writeFile(path.join(dir, name), "{ truncated");
    }

    await expect(store.meta()).resolves.toEqual([]);
  });

  it("still lists readable entries when one file is corrupt", async () => {
    await store.set("good", "value");
    await store.set("bad", "value");

    const names = await storeFiles();
    const corrupt = names.find((name) =>
      name.startsWith(FileSystemStore.hashKey("bad")),
    );
    await writeFile(path.join(dir, corrupt!), "{ truncated");

    const meta = await store.meta();

    expect(meta.map((entry) => entry.key)).toEqual(["good"]);
  });

  it("returns undefined rather than another key's value on a hash collision", async () => {
    // Forcing every key onto one filename is the only reliable way to
    // reproduce a collision without searching for an MD5 pair.
    vi.spyOn(FileSystemStore, "hashKey").mockReturnValue("collision");

    await store.set("keyA", "value A");

    expect(await store.get("keyB")).toBeUndefined();
    expect(await store.getMeta("keyB")).toBeUndefined();
    expect(await store.get("keyA")).toMatchObject({ value: "value A" });
  });

  it("reports a stored undefined value as a hit, not a miss", async () => {
    await store.set("undefinedKey", undefined);

    const entry = await store.get("undefinedKey");

    expect(entry).toBeDefined();
    expect(entry?.key).toBe("undefinedKey");
    expect(entry?.value).toBeUndefined();
  });

  it("agrees between getMeta and get for a truncated entry", async () => {
    await store.set("key", "value");

    const [name] = await storeFiles();
    // Keep the meta line but drop its newline and the value line.
    const contents = await readFile(path.join(dir, name), "utf8");
    await writeFile(
      path.join(dir, name),
      contents.slice(0, contents.indexOf("\n")),
    );

    // A half written entry must not look present to one method and absent to
    // the other, or `has()` and `get()` disagree.
    expect(await store.getMeta("key")).toBeUndefined();
    expect(await store.get("key")).toBeUndefined();
  });

  it("treats an entry with no value line as a miss", async () => {
    await store.set("key", "value");
    const contents = await readFile(store.pathFor("key"), "utf8");

    // The newline landed but the value did not.
    await corrupt("key", `${contents.slice(0, contents.indexOf("\n"))}\n`);

    expect(await store.get("key")).toBeUndefined();
  });

  it("treats an unreadable value line as a miss", async () => {
    await store.set("key", "value");
    const contents = await readFile(store.pathFor("key"), "utf8");
    const metaLine = contents.slice(0, contents.indexOf("\n"));

    await corrupt("key", `${metaLine}\n{ not valid\n`);

    expect(await store.get("key")).toBeUndefined();
    // The metadata is still intact, so listing it is correct.
    expect(await store.getMeta("key")).toMatchObject({ key: "key" });
  });

  it("ignores a file that parses but is not one of ours", async () => {
    await store.set("key", "value");
    await corrupt("key", '{"json":{"unrelated":true}}\n{"json":1}\n');

    expect(await store.getMeta("key")).toBeUndefined();
    expect(await store.get("key")).toBeUndefined();
    expect(await store.meta()).toEqual([]);
  });

  it("ignores a file with an implausibly long first line", async () => {
    await store.set("key", "value");
    // Over the cap, and with no newline to stop at.
    await corrupt("key", "x".repeat(1024 * 1024 + 10));

    expect(await store.getMeta("key")).toBeUndefined();
    expect(await store.meta()).toEqual([]);
  });

  it("ignores a file whose first line is not valid JSON", async () => {
    await store.set("key", "value");
    // Terminated by a newline, so it reaches the parser rather than being
    // rejected earlier as truncated.
    await corrupt("key", '{ not valid\n{"json":1}\n');

    expect(await store.getMeta("key")).toBeUndefined();
    expect(await store.get("key")).toBeUndefined();
    expect(await store.meta()).toEqual([]);
  });

  it("reads a file written with Windows line endings", async () => {
    await store.set("key", "value");
    const contents = await readFile(store.pathFor("key"), "utf8");

    await corrupt("key", contents.replace(/\n/g, "\r\n"));

    expect(await store.getMeta("key")).toMatchObject({ key: "key" });
  });

  it("treats a directory where a file should be as a miss", async () => {
    await mkdir(store.pathFor("key"), { recursive: true });

    expect(await store.getMeta("key")).toBeUndefined();
    expect(await store.get("key")).toBeUndefined();
    expect(await store.meta()).toEqual([]);
  });

  it("returns undefined for a key that was never written", async () => {
    expect(await store.getMeta("never")).toBeUndefined();
    expect(await store.get("never")).toBeUndefined();
  });

  it("reports an empty cache when the directory does not exist", async () => {
    const missing = new FileSystemStore(path.join(dir, "not-created-yet"));

    expect(await missing.meta()).toEqual([]);
    await expect(missing.clear()).resolves.toBeUndefined();
  });
});

describe("FileSystemStore clear", () => {
  it("removes its own entries", async () => {
    await store.set("a", 1);
    await store.set("b", 2);

    await store.clear();

    expect(await store.get("a")).toBeUndefined();
    expect(await store.meta()).toEqual([]);
  });

  it("leaves files it did not create alone", async () => {
    const sentinel = path.join(dir, "sentinel.txt");
    await writeFile(sentinel, "do not delete me");
    await store.set("a", 1);

    await store.clear();

    await expect(readFile(sentinel, "utf8")).resolves.toBe("do not delete me");
  });

  it("removes temporary and displaced files left by an interrupted write", async () => {
    await store.set("a", 1);
    const entry = (await storeFiles())[0];
    await writeFile(path.join(dir, `${entry}.1234.abcd.tmp`), "junk");
    await writeFile(path.join(dir, `${entry}.abcd.old`), "junk");

    await store.clear();

    expect(await storeFiles()).toEqual([]);
  });

  it("can be called on a directory that was never written to", async () => {
    await expect(store.clear()).resolves.toBeUndefined();
  });
});
