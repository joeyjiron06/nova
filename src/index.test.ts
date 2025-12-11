import { setTimeout } from "node:timers/promises";
import os from "os";
import path from "path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Nova } from "./cache";
import FsStore from "./stores/fsStore";
import MemoryStore from "./stores/memoryStore";

const memCache = new Nova({
  store: new MemoryStore(),
});

const fsCachePath = path.join(os.tmpdir(), "cache-test");

const fsCache = new Nova({
  store: new FsStore(fsCachePath),
});

// removes the fs cache directory after all tests are done
afterAll(() => fsCache.clear());

describe("cache", () => {
  describe.each([
    { name: "memory cache", cache: memCache },
    { name: "fs cache", cache: fsCache },
  ])("$name", ({ cache }) => {
    beforeEach(() => cache.clear());

    it("should store and retrieve values", async () => {
      const key = "testKey";
      const value = "testValue";
      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);
    });

    it("should return undefined for non-existent keys", async () => {
      const nonExistentKey = "nonExistentKey";
      expect(await cache.get(nonExistentKey)).toBeUndefined();
    });

    it("should update the TTL when calling setDefaultTTL", async () => {
      const key = "defaultTtlKey";
      const value = "defaultTtlValue";
      const newDefaultTtl = 200; // 200ms

      cache.setDefaultTTL(newDefaultTtl);

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);

      // Wait for TTL to expire
      await setTimeout(newDefaultTtl + 50);

      expect(await cache.get(key)).toBeUndefined();

      cache.setDefaultTTL(0); // reset to no expiration

      await cache.set(key, value);

      // Wait for TTL to expire
      await setTimeout(newDefaultTtl + 50);

      expect(await cache.get(key)).toBe(value);
    });

    it("should handle TTL expiration correctly", async () => {
      const key = "expireKey";
      const value = "expireValue";
      const shortTtl = 100; // 100ms

      await cache.set(key, value, shortTtl);
      expect(await cache.get(key)).toBe(value);

      // Wait for TTL to expire
      await setTimeout(shortTtl + 50);

      expect(await cache.get(key)).toBeUndefined();
    });

    it("should delete cache entries", async () => {
      const key = "deleteKey";
      const value = "deleteValue";

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);

      await cache.delete(key);
      expect(await cache.get(key)).toBeUndefined();
    });

    it("should check if key exists when calling has", async () => {
      const key = "existsKey";
      const value = "existsValue";

      expect(await cache.has(key)).toBe(false);

      await cache.set(key, value);
      expect(await cache.has(key)).toBe(true);

      await cache.delete(key);
      expect(await cache.has(key)).toBe(false);
    });

    it("should wrap function calls with caching", async () => {
      const key = "wrapKey";
      const expectedValue = "wrapValue";

      const fn = vi.fn(() => Promise.resolve(expectedValue));

      const getValue = () => cache.wrap(key, fn);

      const result1 = await getValue();
      expect(result1).toBe(expectedValue);
      expect(fn).toHaveBeenCalledTimes(1);

      const result2 = await getValue();
      expect(result2).toBe(expectedValue);
      expect(fn).toHaveBeenCalledTimes(1); // Function should not be called again due to caching
    });

    it("should bypass cache when disableCache is true in wrap", async () => {
      const key = "bypassKey";
      const expectedValue = "bypassValue";

      const fn = vi.fn(() => Promise.resolve(expectedValue));

      const getValue = () => cache.wrap(key, fn, { disableCache: true });

      const result1 = await getValue();
      expect(result1).toBe(expectedValue);
      expect(fn).toHaveBeenCalledTimes(1);

      const result2 = await getValue();
      expect(result2).toBe(expectedValue);
      expect(fn).toHaveBeenCalledTimes(2); // Function should be called again when cache is disabled
    });

    it("should use custom TTL in wrap method", async () => {
      const key = "customTtlKey";
      const expectedValue = "customTtlValue";
      const customTtl = 100; // 100ms

      const fn = vi.fn(() => Promise.resolve(expectedValue));

      const getValue = () => cache.wrap(key, fn, { ttl: customTtl });

      const result1 = await getValue();
      expect(result1).toBe(expectedValue);
      expect(fn).toHaveBeenCalledTimes(1);

      // Value should be cached initially
      const result2 = await getValue();
      expect(result2).toBe(expectedValue);
      expect(fn).toHaveBeenCalledTimes(1);

      // Wait for custom TTL to expire
      await setTimeout(customTtl + 50);

      // Function should be called again after TTL expires
      const result3 = await getValue();
      expect(result3).toBe(expectedValue);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should return cache metadata", async () => {
      const key1 = "metaKey1";
      const key2 = "metaKey2";
      const value1 = "metaValue1";
      const value2 = "metaValue2";
      const ttl = 5000; // 5 seconds

      await cache.set(key1, value1, ttl);
      await cache.set(key2, value2);

      const metadata = await cache.meta();

      expect(metadata).toHaveLength(2);
      expect(metadata.sort((a, b) => a.key.localeCompare(b.key))).toMatchObject(
        [
          {
            key: key1,
            expiresAt: expect.any(Number),
          },
          {
            key: key2,
            expiresAt: undefined,
          },
        ]
      );
    });

    it("should handle entries that never expire", async () => {
      const key = "neverExpireKey";
      const value = "neverExpireValue";

      // Set entry without TTL (should never expire)
      await cache.set(key, value, 0);

      expect(await cache.get(key)).toBe(value);
      expect(await cache.has(key)).toBe(true);

      // Wait some time to ensure it doesn't expire
      await setTimeout(200);

      expect(await cache.get(key)).toBe(value);
      expect(await cache.has(key)).toBe(true);

      const metadata = await cache.meta();
      const entry = metadata.find((m) => m.key === key);
      expect(entry?.expiresAt).toBeUndefined();
    });

    it("should handle empty keys", async () => {
      const key = "";
      const value = "emptyKeyValue";

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);
    });

    it("should handle null values", async () => {
      const key = "nullKey";
      const value = null;

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(null);
    });

    it("should handle undefined values", async () => {
      const key = "undefinedKey";
      const value = undefined;

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(undefined);
    });

    it("should handle number values", async () => {
      const key = "numberKey";
      const intValue = 42;
      const floatValue = 3.14159;
      const negativeValue = -100;
      const zeroValue = 0;
      const positiveInfinityValue = Number.POSITIVE_INFINITY;
      const negativeInfinityValue = Number.NEGATIVE_INFINITY;

      await cache.set(key + "1", intValue);
      await cache.set(key + "2", floatValue);
      await cache.set(key + "3", negativeValue);
      await cache.set(key + "4", zeroValue);
      await cache.set(key + "5", positiveInfinityValue);
      await cache.set(key + "6", negativeInfinityValue);

      expect(await cache.get(key + "1")).toBe(intValue);
      expect(await cache.get(key + "2")).toBe(floatValue);
      expect(await cache.get(key + "3")).toBe(negativeValue);
      expect(await cache.get(key + "4")).toBe(zeroValue);
      expect(await cache.get(key + "5")).toBe(positiveInfinityValue);
      expect(await cache.get(key + "6")).toBe(negativeInfinityValue);
    });

    it("should handle string values", async () => {
      const key = "stringKey";
      const simpleString = "hello world";
      const unicodeString = "🌟 Hello 世界 🚀";
      const longString = "A".repeat(1000);
      const specialCharsString = "!@#$%^&*()_+-={}|[]\\:\";'<>?,./ `~";

      await cache.set(key + "1", simpleString);
      await cache.set(key + "2", unicodeString);
      await cache.set(key + "3", longString);
      await cache.set(key + "4", specialCharsString);

      expect(await cache.get(key + "1")).toBe(simpleString);
      expect(await cache.get(key + "2")).toBe(unicodeString);
      expect(await cache.get(key + "3")).toBe(longString);
      expect(await cache.get(key + "4")).toBe(specialCharsString);
    });

    it("should handle empty strings", async () => {
      const key = "emptyStringKey";
      const emptyString = "";

      await cache.set(key, emptyString);
      expect(await cache.get(key)).toBe(emptyString);
    });

    it("should handle arrays", async () => {
      const key = "arrayKey";
      const simpleArray = [1, 2, 3];
      const mixedArray = [1, "hello", true, null, undefined];
      const nestedArray = [
        [1, 2],
        ["a", "b"],
        [true, false],
      ];
      const emptyArray: string[] = [];

      await cache.set(key + "1", simpleArray);
      await cache.set(key + "2", mixedArray);
      await cache.set(key + "3", nestedArray);
      await cache.set(key + "4", emptyArray);

      expect(await cache.get(key + "1")).toEqual(simpleArray);
      expect(await cache.get(key + "2")).toEqual(mixedArray);
      expect(await cache.get(key + "3")).toEqual(nestedArray);
      expect(await cache.get(key + "4")).toEqual(emptyArray);
    });

    it("should handle large objects", async () => {
      const key = "largeObjectKey";
      const simpleObject = { name: "John", age: 30, active: true };
      const nestedObject = {
        user: { id: 1, profile: { name: "Jane", settings: { theme: "dark" } } },
        metadata: { created: "2023-01-01", tags: ["admin", "user"] },
      };
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
        })),
        config: {
          options: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`option${i}`, i * 2])
          ),
        },
      };

      await cache.set(key + "1", simpleObject);
      await cache.set(key + "2", nestedObject);
      await cache.set(key + "3", largeObject);

      expect(await cache.get(key + "1")).toEqual(simpleObject);
      expect(await cache.get(key + "2")).toEqual(nestedObject);
      expect(await cache.get(key + "3")).toEqual(largeObject);
    });

    it("should handle circular references in objects", async () => {
      const key = "circularRefKey";

      // Create an object with circular reference
      const parent: unknown = { name: "parent" };
      const child: unknown = { name: "child", parent };

      // @ts-expect-error - Creating circular reference
      parent.child = child;

      await cache.set(key, parent);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(
        expect.objectContaining({
          name: "parent",
          child: expect.objectContaining({
            name: "child",
            parent: expect.objectContaining({
              name: "parent",
            }),
          }),
        })
      );

      // Verify circular reference is maintained
      // @ts-expect-error - Accessing circular reference
      expect(retrieved.child.parent).toBe(retrieved);
    });

    it("should handle Date objects", async () => {
      const key = "dateKey";
      const now = new Date();
      const specificDate = new Date("2023-12-25T10:30:00.000Z");
      const epoch = new Date(0);
      const futureDate = new Date("2030-01-01T00:00:00.000Z");

      await cache.set(key + "1", now);
      await cache.set(key + "2", specificDate);
      await cache.set(key + "3", epoch);
      await cache.set(key + "4", futureDate);

      const retrievedNow = await cache.get(key + "1");
      const retrievedSpecific = await cache.get(key + "2");
      const retrievedEpoch = await cache.get(key + "3");
      const retrievedFuture = await cache.get(key + "4");

      expect(retrievedNow).toBeInstanceOf(Date);
      // @ts-expect-error - ts doesn't know that this is a date already
      expect(retrievedNow?.getTime()).toBe(now.getTime());
      expect(retrievedSpecific).toEqual(specificDate);
      expect(retrievedEpoch).toEqual(epoch);
      expect(retrievedFuture).toEqual(futureDate);
    });

    it("should handle Map and Set objects", async () => {
      const key = "mapSetKey";

      const testMap = new Map<unknown, unknown>([
        ["key1", "value1"],
        ["key2", 42],
        [3, "number key"],
        [true, false],
      ]);

      const testSet = new Set([1, "hello", true, null, { id: 1 }]);

      await cache.set(key + "1", testMap);
      await cache.set(key + "2", testSet);

      const retrievedMap = await cache.get<Map<unknown, unknown>>(key + "1");
      const retrievedSet = await cache.get<Set<unknown>>(key + "2");

      expect(retrievedMap).toBeInstanceOf(Map);
      expect(retrievedSet).toBeInstanceOf(Set);
      expect(retrievedMap).toEqual(testMap);
      expect(retrievedSet).toEqual(testSet);

      // Verify Map functionality
      expect(retrievedMap?.get("key1")).toBe("value1");
      expect(retrievedMap?.get("key2")).toBe(42);
      expect(retrievedMap?.size).toBe(4);

      // Verify Set functionality
      expect(retrievedSet?.has(1)).toBe(true);
      expect(retrievedSet?.has("hello")).toBe(true);
      expect(retrievedSet?.size).toBe(5);
    });
  });
});
