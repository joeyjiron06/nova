<h1 style="display: flex; align-items: center; gap: 0.5rem;"><img src="./logo.png" style="width: 3rem; height: 3rem;"  width="48" height="48" />  nova</h1>

An extremely lightweight utility for caching data. This is an isomorphic library that can be used in any Javascript environment (e.g. NodeJs, Browser, Bun, Deno, etc.). The core caching logic (for things like TTL) is implemented in pure javascript with NO DEPENDENCIES. Each caching layer can be implemented to support multiple environments.

## Installation

```bash
pnpm i nova
```

## Usage

```ts
import { Nova } from "nova";
import MemoryStore from 'nova/store/memory';

const memCache = new Nova({
  store: new MemoryStore()
  ttl: 60_000, // default TTL in milliseconds
})



await memCache.set('key', 'value')
await memCache.get('key') // returns 'value'
```

**Filesystem usage**

This library uses [superjson](https://www.npmjs.com/package/superjson) to serialize and deserialize data which solves the problem when you want to store objects that contain Dates, Maps, Sets or other similar data structures that are problematic when using `JSON.stringify`. That means you can do something like

```ts
import { Nova } from "nova";
import FilesystemStore from 'nova/store/filesystem';

const fsCache = new Nova({
  store: new FilesystemStore()
  ttl: 60_000, // default TTL in milliseconds
})



await fsCache.set('key', {
  createdAt: new Date(),
  items: new Map({ 'key1': 1, 'key2': 2 })
})

// will return an object with Date and Map javascript objects even though it's saved to the filesystem
await fsCache.get('key')
```

See [superjson](https://www.npmjs.com/package/superjson) for limitations on what can and cannot be serialized.

Check out the other stores in to `/src/stores` folder.

## Motivation

While many excellent caching libraries exist—such as [keyv](https://keyv.org/docs/), [cache-manager](https://www.npmjs.com/package/cache-manager), [lru-cache](https://www.npmjs.com/package/lru-cache), and [idb-keyval](https://www.npmjs.com/package/idb-keyval)—most are designed for specific storage technologies (IndexedDB, localStorage, in-memory, etc.). When implementing TTL (time-to-live) functionality across different storage solutions, developers often end up writing custom expiration logic for each adapter.

Nova addresses this gap by providing a unified caching API with built-in TTL management that works across any JavaScript environment. Using the [adapter pattern](https://en.wikipedia.org/wiki/Adapter_pattern), it decouples cache logic from storage implementation, allowing you to:

- Write cache code once and deploy anywhere (Node.js, browsers, Bun, Deno)
- Switch storage backends without changing application code
- Implement custom storage adapters with minimal effort
- Maintain consistent TTL behavior across all storage types

This approach eliminates the need to reimplement expiration logic while providing the flexibility to use any storage solution that fits your use case.

## API

See [./src/cache.ts](./src/cache.ts) for the full API.
