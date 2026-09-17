# Nova Landing Page — Section Decisions & Build Brief

## Goal

Build a developer-focused landing page for Nova, a tiny JavaScript cache library.

The page should feel like it was written by developers for developers:

- Direct and conversational
- Concrete rather than marketing-heavy
- Understated and confident
- No buzzwords or generic SaaS language
- Explain real developer pain and how Nova addresses it
- Prefer code and simple diagrams over excessive marketing copy
- Avoid claiming Nova is universally "better" than established libraries
- The central differentiator is that Nova provides a consistent cache abstraction across JavaScript runtimes while keeping storage separate from cache behavior.

The existing page already contains:

1. Hero
2. Runtime logos
3. Feature overview

The sections below are the agreed direction for the remainder of the page.

---

# Section 4 — The Problem

## Headline

> Caching shouldn't be different in every environment.

## Supporting copy

> In-memory, filesystem, IndexedDB — each one usually means reaching for a different library. Different APIs. Different TTL semantics. Different features. Different things to learn.
>
> Your caching strategy shouldn't change just because your storage does.

## Purpose

Establish the problem Nova is solving.

The issue isn't simply that there are multiple cache libraries. The problem is that caching implementations tend to become coupled to the environment and storage mechanism.

A developer may end up learning one library for memory, another for filesystem persistence, another for browser storage, etc. Those libraries can expose different APIs and semantics.

Do not make absolute claims such as "every cache library reimplements TTL." Frame this as an ecosystem reality.

## Visual concept

Show a fragmented caching stack:

```text
YOUR APPLICATION
       │
       ├── Memory cache
       │      └── Library A
       │
       ├── File cache
       │      └── Library B
       │
       └── IndexedDB cache
              └── Library C
```

Each branch can visually show that it has different APIs, TTL behavior, and features.

Optional punchline:

> Same problem. Three libraries. Three sets of semantics.

The visual should communicate fragmentation, not overwhelm the user with technical detail.

---

# Section 5 — The Solution

## Headline

> One cache API. Any storage.

## Supporting copy

> Nova separates your caching logic from where the data lives. Use the same API whether you're caching in memory, on the filesystem, in IndexedDB, or in your own storage implementation.

## Key message

**Storage is an implementation detail.**

This is an important architectural differentiator.

Nova owns the cache abstraction and semantics while the underlying `CacheStore` determines where the data lives.

The user should understand that changing storage does not require changing application-level caching code.

## Code example

```ts
const cache = new Nova({
  store: new MemoryStore(),
});

await cache.set("user:123", user);
const user = await cache.get("user:123");
```

Then demonstrate changing only the store:

```ts
const cache = new Nova({
  store: new FilesystemStore("./cache"),
});
```

The application-level `set()` / `get()` usage remains unchanged.

## Visual concept

Show the same application code pointing toward different storage implementations.

```text
              YOUR APPLICATION
                     │
                     ▼
                Nova API
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Memory    Filesystem   IndexedDB
```

The visual should emphasize that the API stays stable while storage changes.

## Closing line

> Change where your cache lives. Not how you use it.

---

# Section 6 — `wrap()`

## Headline

> Can I just cache this?

This headline should remain conversational. It sounds like an actual thought a developer might have when looking at an expensive operation.

## Supporting copy

> Wrap an expensive operation and Nova handles the rest. On a cache hit, you get the stored result. On a miss, Nova runs the function, stores the result, and returns it.

## Primary code

```ts
const user = await cache.wrap("user:123", () => fetchUser("123"));
```

## Visual concept

Show the two possible execution paths.

```text
                 cache.wrap()
                      │
               ┌──────┴──────┐
               │             │
           cache hit     cache miss
               │             │
               ▼             ▼
         return value     run function
                              │
                              ▼
                         cache result
                              │
                              ▼
                         return value
```

The visual should make it immediately obvious that the developer doesn't need to manually:

1. Check the cache
2. Decide whether to execute the operation
3. Store the result
4. Return the result

Nova handles that flow.

## Escape hatches

Show that `wrap()` isn't restrictive:

```ts
cache.wrap(key, fn, { forceRefresh: true });

cache.wrap(key, fn, { disableCache: true });
```

These demonstrate:

- `forceRefresh` — execute the function and refresh the cached value
- `disableCache` — bypass caching entirely

Keep this secondary to the main `wrap()` example.

---

# Section 7 — TTL

## Headline

> Set your TTL once. Override it anywhere.

This headline is finalized and should not be changed.

## Supporting copy

> Set a default TTL once and Nova applies it to everything you cache. Override it when an entry needs a different lifetime — or set it to `0` when it should never expire.

## Key concept

Nova's `ttl` on the `Nova` instance establishes the default TTL for cache entries.

Individual entries can override that default.

A TTL of `0` means the entry does not expire.

## Visual concept

Show one default TTL flowing to multiple entries, with individual overrides:

```text
DEFAULT
60 seconds
     │
     ├── user:123       → 60s
     ├── posts:123      → 60s
     ├── weather        → 60s
     │
     ├── config         → 1 hour  ← override
     │
     └── static-data    → ∞       ← never expires
```

The point is that developers don't need to repeatedly configure the common case, while still having per-entry control.

## Code

```ts
const cache = new Nova({
  store: new MemoryStore(),
  ttl: 60_000, // default: 1 minute
});

await cache.set("user:123", user);
await cache.set("posts:123", posts);

await cache.set("config", config, 60 * 60_000);
await cache.set("static-data", data, 0);
```

Do not over-explain TTL. The visual should make the behavior obvious.

---

# Sections We Explicitly Removed

Do **not** add these sections:

## Bring Your Own Store

We considered a dedicated section about implementing a custom `CacheStore`, but rejected it as redundant.

Section 5 already communicates that storage is swappable and that Nova supports custom storage implementations.

Custom-store extensibility can still be mentioned briefly in Section 5, but does not deserve its own section.

## Serialization

We considered a section about JavaScript value serialization and persistent values such as `Date` and `Map`, but rejected it.

It is an implementation capability rather than a core reason to use Nova and would interrupt the main narrative.

## "A Cache, Not a Framework"

We considered a positioning section about Nova being intentionally small and not trying to manage application state or architecture.

This was also rejected as redundant.

The existing sections already communicate Nova's focused scope.

## Complete Example

We considered a dedicated complete-example section combining all of the API concepts.

This was rejected. The individual sections already provide enough code examples, and another large example would add repetition rather than a new idea.

---

# Section 8 / Second-to-Last — Comparison

## Headline

> How Nova compares

## Supporting copy

> There are plenty of great caching libraries for JavaScript. Most are designed around a particular runtime or caching strategy. Nova takes a different approach: one cache API that works across JavaScript runtimes and lets storage remain an implementation detail.

## Purpose

Give developers an honest comparison against established cache libraries.

This should NOT be presented as:

- "Nova is better"
- "Nova is faster"
- "Nova has more features"
- "Nova is more popular"
- A ranking of cache libraries

Nova is a new/smaller library. The comparison should acknowledge that established libraries have their own strengths and ecosystems.

The point is to make Nova's particular design tradeoff obvious.

## Libraries to compare

Use:

- Nova
- `lru-cache`
- Keyv
- `cache-manager`
- `node-cache`

## Comparison table

|                              | **Nova**                        | **lru-cache** | **Keyv**          | **cache-manager**     | **node-cache**       |
| ---------------------------- | ------------------------------- | ------------- | ----------------- | --------------------- | -------------------- |
| **Node.js**                  | ✓                               | ✓             | ✓                 | ✓                     | ✓                    |
| **Browser**                  | ✓                               | ✓             | —                 | —                     | —                    |
| **Other JS runtimes**        | ✓                               | Partial\*     | Best effort\*\*   | —                     | —                    |
| **Pluggable storage**        | ✓                               | —             | ✓                 | ✓                     | —                    |
| **Built-in TTL**             | ✓                               | ✓             | ✓                 | ✓                     | ✓                    |
| **Per-entry TTL**            | ✓                               | ✓             | ✓                 | ✓                     | ✓                    |
| **`wrap()` async functions** | ✓                               | —             | —                 | ✓                     | —                    |
| **Filesystem storage**       | ✓                               | —             | Adapter           | Adapter               | —                    |
| **Primary focus**            | Cross-runtime cache abstraction | In-memory LRU | Key-value storage | Node.js cache manager | Node.js memory cache |

## Important notes

The exact compatibility claims should be verified against the current Nova implementation before publishing.

Especially verify which "other JS runtimes" Nova officially supports or has been tested against. Potential examples include Deno, Bun, Cloudflare Workers, etc., but don't claim support that hasn't been established.

For the comparison libraries:

- `lru-cache` is primarily an in-memory LRU cache and provides browser builds.
- Keyv is a key-value storage abstraction with a broad storage-adapter ecosystem.
- `cache-manager` is a Node.js-oriented caching abstraction with storage integrations.
- `node-cache` is a Node.js in-memory cache.

Do not imply these libraries are bad choices. Their different design goals are the reason they make useful comparisons.

## Popularity numbers

Do not put npm download counts/dependent counts in the table.

Those numbers change constantly and aren't necessary to explain Nova's differentiation.

If desired, add a small line beneath the table:

> Established alternatives, different tradeoffs.

Then:

> Nova isn't trying to replace every caching library. It's for when you want the same cache abstraction across Node, browsers, and other JavaScript runtimes.

## Primary differentiator to emphasize

The table should make this immediately apparent:

**Nova works across Node, browsers, and JavaScript runtimes while keeping the cache API independent from storage.**

This is the key reason someone who already knows `lru-cache`, Keyv, etc. should investigate Nova.

---

# Final Section — Install CTA

## Headline

> Start caching.

This headline is finalized.

It should be understated rather than a large marketing-style CTA.

## Supporting copy

> Install Nova and add a cache to your application in a few lines.

## Primary install command

```bash
npm install nova
```

Use the actual published package name if different before shipping.

## Actions

Primary:

> Install Nova

Link to the npm package.

Secondary:

> View on GitHub

Link to the GitHub repository.

## Closing line

> Open source. Tiny by design. Works anywhere JavaScript runs.

Keep this section visually simple. The page has already made the argument; the CTA should make taking the next step obvious.

---

# Overall Narrative

The page should now progress roughly like this:

```text
HERO
A tiny JavaScript cache that runs anywhere
        │
        ▼
RUNTIME LOGOS
Node / Browser / other JS runtimes
        │
        ▼
FEATURES
What Nova provides
        │
        ▼
PROBLEM
Caching shouldn't be different in every environment.
        │
        ▼
SOLUTION
One cache API. Any storage.
        │
        ▼
WRAP
Can I just cache this?
        │
        ▼
TTL
Set your TTL once. Override it anywhere.
        │
        ▼
COMPARISON
How Nova compares
        │
        ▼
CTA
Start caching.
```

The page should feel like one continuous argument rather than a collection of unrelated feature sections:

**Different environments shouldn't require different caching strategies → Nova separates the cache API from storage → common caching operations are simple → TTL behavior is consistent and configurable → here's how Nova differs from existing libraries → try it.**

Avoid adding additional sections unless they introduce a genuinely new idea.
