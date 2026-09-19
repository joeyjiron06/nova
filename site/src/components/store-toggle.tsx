"use client";

// The one interactive island on the landing page. Clicking a store swaps the
// `store:` line below while the get/set calls stay put — the whole point of
// Section 5, made tactile. Everything else on the page stays server-rendered.
import { useState } from "react";

// Syntax colors mapped to the theme's semantic palette — kept in sync with the
// tokens in index.tsx so the block matches the rest of the page.
const tok = {
  kw: "text-fd-info",
  str: "text-fd-success",
  fn: "text-fd-idea",
  plain: "text-fd-foreground",
};

const stores = [
  { seg: "Memory", ctor: "MemoryStore", arg: "" },
  { seg: "Filesystem", ctor: "FileSystemStore", arg: '"./cache"' },
  { seg: "IndexedDB", ctor: "IndexedDBStore", arg: "" },
];
// widest store line — invisible placeholder that reserves the row width
const WIDEST = stores[1]!;

function StoreConstructorLine({ ctor, arg }: { ctor: string; arg: string }) {
  return (
    <>
      <span className={tok.plain}>{"  "}store:</span>{" "}
      <span className={tok.kw}>new</span> <span className={tok.fn}>{ctor}</span>
      <span className={tok.plain}>(</span>
      {arg ? <span className={tok.str}>{arg}</span> : null}
      <span className={tok.plain}>),</span>
    </>
  );
}

export function StoreToggle() {
  const [active, setActive] = useState(0);
  const store = stores[active]!;

  return (
    <div className="w-full max-w-md">
      {/* segmented control — real buttons, one per store */}
      <div className="bg-fd-muted relative flex rounded-lg p-1">
        {/* sliding pill — one third wide, follows the active button */}
        <span
          aria-hidden
          className="bg-fd-background absolute inset-y-1 left-1 rounded-md shadow-sm transition-transform duration-200 ease-out"
          style={{
            width: "calc((100% - 0.5rem) / 3)",
            transform: `translateX(${active * 100}%)`,
          }}
        />
        {stores.map((s, i) => (
          <button
            key={s.seg}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className={`relative z-10 flex-1 cursor-pointer rounded-md py-1.5 text-center text-sm font-medium transition-colors ${
              i === active
                ? "text-fd-foreground"
                : "text-fd-muted-foreground hover:text-fd-foreground"
            }`}
          >
            {s.seg}
          </button>
        ))}
      </div>

      {/* code panel — only the middle line changes with the selection */}
      <figure className="bg-fd-card mt-3 overflow-hidden rounded-xl border shadow-sm">
        <figcaption className="text-fd-muted-foreground flex h-9.5 items-center border-b px-4">
          <span className="font-mono text-xs">cache.ts</span>
        </figcaption>
        <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6">
          <code className="grid">
            <span>
              <span className={tok.kw}>const</span>{" "}
              <span className={tok.plain}>cache =</span>{" "}
              <span className={tok.kw}>new</span>{" "}
              <span className={tok.fn}>Nova</span>
              <span className={tok.plain}>({"{"}</span>
            </span>
            {/* the swapping line — sized by an invisible widest placeholder */}
            <span className="relative">
              <span className="invisible" aria-hidden>
                <StoreConstructorLine ctor={WIDEST.ctor} arg={WIDEST.arg} />
              </span>
              <span className="absolute inset-y-0 left-0">
                <StoreConstructorLine ctor={store.ctor} arg={store.arg} />
              </span>
            </span>
            <span className={tok.plain}>{"});"}</span>
            <span>&nbsp;</span>
            <span>
              <span className={tok.kw}>await</span>{" "}
              <span className={tok.plain}>cache.</span>
              <span className={tok.fn}>set</span>
              <span className={tok.plain}>(</span>
              <span className={tok.str}>&quot;user:123&quot;</span>
              <span className={tok.plain}>, user);</span>
            </span>
            <span>
              <span className={tok.kw}>await</span>{" "}
              <span className={tok.plain}>cache.</span>
              <span className={tok.fn}>get</span>
              <span className={tok.plain}>(</span>
              <span className={tok.str}>&quot;user:123&quot;</span>
              <span className={tok.plain}>);</span>
            </span>
          </code>
        </pre>
      </figure>
    </div>
  );
}
