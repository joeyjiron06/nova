import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Covers the write paths that only run when the filesystem refuses a rename.
 *
 * These live in their own file because faking `rename` means mocking
 * `node:fs/promises` for the whole module, and the main test file needs the
 * real one to plant and inspect files.
 *
 * The behaviour being tested is not hypothetical. On Windows a rename onto a
 * file that any process has open fails with EPERM, so this is the ordinary path
 * for a key that is read while it is written.
 */

/** Swapped per test to decide how the next renames behave. */
let renameBehaviour: (from: string, to: string) => Promise<void> | void = () => {};

/** Swapped per test to decide how the next deletions behave. */
let rmBehaviour: (target: string) => Promise<void> | void = () => {};

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();

  return {
    ...actual,
    default: actual,
    rename: async (from: string, to: string) => {
      await renameBehaviour(from, to);
      return actual.rename(from, to);
    },
    rm: async (target: string, options?: Parameters<typeof actual.rm>[1]) => {
      await rmBehaviour(target);
      return actual.rm(target, options);
    },
  };
});

const { default: FileSystemStore } = await import("./fileSystemStore");

/** Builds the error Windows raises when the destination is held open. */
function busyError(): NodeJS.ErrnoException {
  return Object.assign(new Error("EPERM: operation not permitted, rename"), {
    code: "EPERM",
  });
}

let dir: string;
let store: InstanceType<typeof FileSystemStore>;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "nova-fs-errors-"));
  store = new FileSystemStore(dir);
  renameBehaviour = () => {};
  rmBehaviour = () => {};
});

afterEach(async () => {
  renameBehaviour = () => {};
  rmBehaviour = () => {};
  const actual = await vi.importActual<typeof import("node:fs/promises")>(
    "node:fs/promises",
  );
  await actual.rm(dir, { recursive: true, force: true });
});

describe("FileSystemStore write failures", () => {
  /**
   * Mimics Windows: a rename onto an existing entry is refused, but a rename
   * onto a free name is allowed.
   */
  function refuseWhileTargetExists(): () => number {
    let refusals = 0;
    renameBehaviour = async (_from, to) => {
      if (!to.endsWith(".jsonl")) {
        return;
      }
      const actual = await vi.importActual<typeof import("node:fs/promises")>(
        "node:fs/promises",
      );
      const exists = await actual
        .stat(to)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        refusals++;
        throw busyError();
      }
    };
    return () => refusals;
  }

  it("falls back to moving the old entry aside when the rename is refused", async () => {
    await store.set("key", "first");

    const refusals = refuseWhileTargetExists();

    await store.set("key", "second");

    // The retry budget cannot win here, so the only way through is the
    // fallback that moves the old entry out of the way.
    expect(refusals()).toBeGreaterThan(0);
    expect(await store.get("key")).toMatchObject({ value: "second" });
  });

  it("gives up and reports the error when the name never frees up", async () => {
    await store.set("key", "first");

    renameBehaviour = (_from, to) => {
      if (to.endsWith(".jsonl")) {
        throw busyError();
      }
    };

    await expect(store.set("key", "second")).rejects.toThrow(/EPERM/);
  });

  it("leaves no temporary file behind when a write fails", async () => {
    renameBehaviour = () => {
      throw busyError();
    };

    await expect(store.set("key", "value")).rejects.toThrow(/EPERM/);

    const { readdir } = await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
    expect(await readdir(dir)).toEqual([]);
  });

  it("reports a rename error that is not a busy destination immediately", async () => {
    renameBehaviour = () => {
      throw Object.assign(new Error("ENOSPC: no space left on device"), {
        code: "ENOSPC",
      });
    };

    // A full disk will not clear by retrying, so it must surface at once
    // rather than after the retry budget.
    const startedAt = Date.now();
    await expect(store.set("key", "value")).rejects.toThrow(/ENOSPC/);
    expect(Date.now() - startedAt).toBeLessThan(200);
  });

  it("reports the write error even when cleaning up also fails", async () => {
    renameBehaviour = () => {
      throw busyError();
    };
    rmBehaviour = () => {
      throw Object.assign(new Error("EBUSY: resource busy"), { code: "EBUSY" });
    };

    // The failed tidy up must not replace the error the caller needs to see.
    await expect(store.set("key", "value")).rejects.toThrow(/EPERM/);
  });

  it("copes when the entry being moved aside is deleted first", async () => {
    await store.set("key", "first");

    let refusals = 0;
    renameBehaviour = async (_from, to) => {
      if (to.endsWith(".old")) {
        // Another process removed the entry between our check and our move.
        await rm(store.pathFor("key"), { force: true });
        return;
      }
      if (to.endsWith(".jsonl") && refusals < 40) {
        refusals++;
        throw busyError();
      }
    };

    await store.set("key", "second");

    expect(await store.get("key")).toMatchObject({ value: "second" });
  });
});
