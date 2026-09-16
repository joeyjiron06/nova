# Landing Page

## Hero

### Title

> A tiny cache. Bring your own storage.

### Subtitle

> get, set, and TTL that behave the same in Node, the browser, Bun, and Deno. Memory, filesystem, IndexedDB — or write your own store in an afternoon.

### Notes

- "Tiny" is verifiable: zero dependencies in the core.
- "Bring your own storage" explains the adapter pattern without naming it, and signals the dev is in control.
- Pairs well with a hero code block where only the `store:` line changes (Memory → Filesystem → IndexedDB) while the rest of the code stays untouched.

### Proof points to keep visible near the hero

- Zero dependencies (core TTL logic is pure JS)
- Isomorphic: Node / Browser / Bun / Deno
- Adapter pattern: swap stores, keep your code

### Visualization: animated store-swap code block

The hero visual. A live code snippet where **only the `store:` line changes** while the rest of the code stays frozen — the animation *is* the pitch (headline and visual say the same thing: swap the storage, keep the code).

**Placement:** right side of the hero on desktop (title/subtitle/CTAs on the left), stacked below the copy on mobile.

**The code:**

```ts
import { Nova } from "nova-cache";
import MemoryStore from "nova-cache/store/memory";

const cache = new Nova({
  store: new MemoryStore(), // ← this line animates
  ttl: 60_000,
});

await cache.set("user:42", { name: "Ada" });
await cache.get("user:42");
```

**Animation behavior:**

- Cycle the `store:` value (and its matching import line) through:
  1. `new MemoryStore()`
  2. `new FilesystemStore()`
  3. `new IndexedDBStore()`
  4. `new YourStore()` — ends the loop on the extensibility message
- Hold each state ~2.5–3s; transition with a quick type-out or crossfade (~300ms). No bouncy easing — keep it calm, this is infrastructure.
- Subtle highlight (background flash or gutter marker) on the changed lines only, so the eye lands on the diff.
- Everything else in the snippet must visibly NOT change — that stillness is the message.
- Pause the loop on hover; respect `prefers-reduced-motion` (show static `MemoryStore` state with a small "memory / filesystem / indexeddb / yours" tab row instead).

**Styling notes:**

- Real syntax highlighting (Shiki, matching the docs theme), monospace = JetBrains Mono (already loaded on the site).
- Frame it like an editor snippet: rounded corners, subtle border, optional filename tab (`cache.ts`). No fake macOS traffic lights — dated.
- Keep the snippet ≤10 lines so it never scrolls.

**Implementation note:** no library needed — a small React component with a `setInterval`/`requestAnimationFrame` state cycle over pre-highlighted line variants. Pre-render all four states and crossfade between them to avoid layout shift (pad store names or fix the container width to the longest variant).
