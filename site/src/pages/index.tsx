// Custom landing page — bypasses the default docs layout.
// Files under src/pages are served by fumapress's filesystem router
// and only get the root HTML/CSS shell, not the sidebar/nav.

// The animated store-swap is pure CSS (keyframes + negative delays) so this
// page stays a server component — no client JS shipped for the hero.
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { createHomeLayout } from "fumapress/layouts/home";
import { InstallTabs } from "../components/install-tabs";
import { StoreToggle } from "../components/store-toggle";
import FaultyTerminal from "../components/faulty-terminal";
import { AsciiTopography } from "../components/ascii-topography";

const HomeLayout = createHomeLayout({
  layoutProps: {
    githubUrl: "https://github.com/joeyjiron/nova",
    links: [{ text: "Docs", url: "/getting-started" }],
    searchToggle: {
      enabled: false,
    },
  },
});

const stores = [
  { name: "MemoryStore", path: "nova-cache/store/memory" },
  { name: "FileSystemStore", path: "nova-cache/store/filesystem" },
  { name: "IndexedDBStore", path: "nova-cache/store/indexeddb" },
  { name: "YourStore", path: "./your-store" },
];

// widest variants, used as invisible placeholders to prevent layout shift
const WIDEST = stores[2]!;

// Syntax colors mapped to the theme's semantic palette — no arbitrary values,
// so the block adapts to light/dark and any fumadocs theme.
const tok = {
  kw: "text-fd-info",
  str: "text-fd-success",
  fn: "text-fd-idea",
  num: "text-fd-warning",
  plain: "text-fd-foreground",
  comment: "text-fd-muted-foreground",
};

const CYCLE_S = 12; // 4 variants × 3s each
const swapCss = `
@keyframes nova-swap {
  0%    { opacity: 0; }
  2.5%  { opacity: 1; background-color: var(--color-fd-accent); }
  8%    { background-color: transparent; }
  22.5% { opacity: 1; }
  25%   { opacity: 0; }
  100%  { opacity: 0; }
}
.nova-swap-item {
  animation: nova-swap ${CYCLE_S}s linear infinite;
  border-radius: 0.25rem;
}
.nova-code:hover .nova-swap-item {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .nova-swap-item { animation: none !important; opacity: 0; }
  .nova-swap-item[data-first] { opacity: 1; }
}
`;

function SwapLine({
  variants,
  widest,
}: {
  variants: React.ReactNode[];
  widest: React.ReactNode;
}) {
  return (
    <div className="relative">
      <span className="invisible" aria-hidden>
        {widest}
      </span>
      {variants.map((variant, i) => (
        <span
          key={i}
          data-first={i === 0 ? "" : undefined}
          className="nova-swap-item absolute inset-y-0 left-0"
          style={{ animationDelay: `${i * 3 - CYCLE_S}s` }}
        >
          {variant}
        </span>
      ))}
    </div>
  );
}

function ImportLine({ name, path }: { name: string; path: string }) {
  return (
    <span>
      <span className={tok.kw}>import</span>{" "}
      <span className={tok.plain}>{name}</span>{" "}
      <span className={tok.kw}>from</span>{" "}
      <span className={tok.str}>&quot;{path}&quot;</span>
      <span className={tok.plain}>;</span>
    </span>
  );
}

function StoreLine({ name }: { name: string }) {
  return (
    <span>
      <span className={tok.plain}>{"  "}store:</span>{" "}
      <span className={tok.kw}>new</span> <span className={tok.fn}>{name}</span>
      <span className={tok.plain}>(),</span>
    </span>
  );
}

function StoreSwapCode() {
  return (
    <figure className="nova-code bg-fd-card w-full max-w-xl overflow-hidden rounded-xl border shadow-sm">
      <style>{swapCss}</style>
      <figcaption className="text-fd-muted-foreground flex h-9.5 items-center border-b px-4">
        <span className="font-mono text-xs">cache.ts</span>
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6">
        <code className="grid">
          <span>
            <span className={tok.kw}>import</span>{" "}
            <span className={tok.plain}>{"{ Nova }"}</span>{" "}
            <span className={tok.kw}>from</span>{" "}
            <span className={tok.str}>&quot;nova-cache&quot;</span>
            <span className={tok.plain}>;</span>
          </span>
          <SwapLine
            widest={<ImportLine name={WIDEST.name} path={WIDEST.path} />}
            variants={stores.map((s) => (
              <ImportLine key={s.name} name={s.name} path={s.path} />
            ))}
          />
          <span>&nbsp;</span>
          <span>
            <span className={tok.kw}>const</span>{" "}
            <span className={tok.plain}>cache =</span>{" "}
            <span className={tok.kw}>new</span>{" "}
            <span className={tok.fn}>Nova</span>
            <span className={tok.plain}>({"{"}</span>
          </span>
          <SwapLine
            widest={<StoreLine name={WIDEST.name} />}
            variants={stores.map((s) => (
              <StoreLine key={s.name} name={s.name} />
            ))}
          />
          <span>
            <span className={tok.plain}>{"  "}ttl:</span>{" "}
            <span className={tok.num}>60_000</span>
            <span className={tok.plain}>,</span>
          </span>
          <span className={tok.plain}>{"});"}</span>
          <span>&nbsp;</span>
          <span>
            <span className={tok.kw}>await</span>{" "}
            <span className={tok.plain}>cache.</span>
            <span className={tok.fn}>set</span>
            <span className={tok.plain}>(</span>
            <span className={tok.str}>&quot;user:42&quot;</span>
            <span className={tok.plain}>
              , {"{"} name: <span className={tok.str}>&quot;Ada&quot;</span>{" "}
              {"}"});
            </span>
          </span>
          <span>
            <span className={tok.kw}>await</span>{" "}
            <span className={tok.plain}>cache.</span>
            <span className={tok.fn}>get</span>
            <span className={tok.plain}>(</span>
            <span className={tok.str}>&quot;user:42&quot;</span>
            <span className={tok.plain}>);</span>
          </span>
        </code>
      </pre>
    </figure>
  );
}

function Hero() {
  return (
    <section className="relative flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <FaultyTerminal
          scale={2}
          gridMul={[2, 1]}
          digitSize={1.2}
          timeScale={0.3}
          scanlineIntensity={0.5}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          curvature={0.1}
          tint="#f97316"
          mouseReact={false}
          pageLoadAnimation
          brightness={0.7}
        />
        {/* solid background on the left (behind the copy) fading to reveal the
            terminal on the right so the hero text stays readable */}
        <div className="from-fd-background via-fd-background/80 absolute inset-0 bg-gradient-to-r to-transparent" />
      </div>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            A <span className="font-light italic">tiny</span> JavaScript cache
            that runs anywhere
          </h1>
          <p className="text-fd-muted-foreground max-w-lg text-lg text-pretty">
            <code className="font-mono text-[0.9em]">get</code>,{" "}
            <code className="font-mono text-[0.9em]">set</code>, and TTL that
            behave the same in Node, the browser, Bun, and Deno. Memory,
            filesystem, IndexedDB — or write your own store in an afternoon.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/getting-started"
              className={buttonVariants({
                variant: "primary",
                className: "px-5 py-2.5",
              })}
            >
              Get started
            </a>
            <a
              href="https://github.com/joeyjiron/nova"
              className={buttonVariants({
                variant: "outline",
                className: "px-5 py-2.5",
              })}
            >
              View on GitHub
            </a>
          </div>
          <InstallTabs />
        </div>
        <div className="flex justify-center lg:justify-end">
          <StoreSwapCode />
        </div>
      </div>
    </section>
  );
}

type Runtime = { name: string; hex: string; path: string; mono?: boolean };

// Accurate brand marks (paths from simple-icons). Rendered grayscale, color
// on hover — the "receipts" pattern that reads as credible, not salesy.
// `mono: true` marks brands whose logo is black — those follow the theme
// foreground (white in dark mode) instead of an invisible fixed black.
const runtimes: Runtime[] = [
  {
    name: "Node.js",
    hex: "#5FA04E",
    path: "M11.998,24c-0.321,0-0.641-0.084-0.922-0.247l-2.936-1.737c-0.438-0.245-0.224-0.332-0.08-0.383 c0.585-0.203,0.703-0.25,1.328-0.604c0.065-0.037,0.151-0.023,0.218,0.017l2.256,1.339c0.082,0.045,0.197,0.045,0.272,0l8.795-5.076 c0.082-0.047,0.134-0.141,0.134-0.238V6.921c0-0.099-0.053-0.192-0.137-0.242l-8.791-5.072c-0.081-0.047-0.189-0.047-0.271,0 L3.075,6.68C2.99,6.729,2.936,6.825,2.936,6.921v10.15c0,0.097,0.054,0.189,0.139,0.235l2.409,1.392 c1.307,0.654,2.108-0.116,2.108-0.89V7.787c0-0.142,0.114-0.253,0.256-0.253h1.115c0.139,0,0.255,0.112,0.255,0.253v10.021 c0,1.745-0.95,2.745-2.604,2.745c-0.508,0-0.909,0-2.026-0.551L2.28,18.675c-0.57-0.329-0.922-0.945-0.922-1.604V6.921 c0-0.659,0.353-1.275,0.922-1.603l8.795-5.082c0.557-0.315,1.296-0.315,1.848,0l8.794,5.082c0.57,0.329,0.924,0.944,0.924,1.603 v10.15c0,0.659-0.354,1.273-0.924,1.604l-8.794,5.078C12.643,23.916,12.324,24,11.998,24z M19.099,13.993 c0-1.9-1.284-2.406-3.987-2.763c-2.731-0.361-3.009-0.548-3.009-1.187c0-0.528,0.235-1.233,2.258-1.233 c1.807,0,2.473,0.389,2.747,1.607c0.024,0.115,0.129,0.199,0.247,0.199h1.141c0.071,0,0.138-0.031,0.186-0.081 c0.048-0.054,0.074-0.123,0.067-0.196c-0.177-2.098-1.571-3.076-4.388-3.076c-2.508,0-4.004,1.058-4.004,2.833 c0,1.925,1.488,2.457,3.895,2.695c2.88,0.282,3.103,0.703,3.103,1.269c0,0.983-0.789,1.402-2.642,1.402 c-2.327,0-2.839-0.584-3.011-1.742c-0.02-0.124-0.126-0.215-0.253-0.215h-1.137c-0.141,0-0.254,0.112-0.254,0.253 c0,1.482,0.806,3.248,4.655,3.248C17.501,17.007,19.099,15.91,19.099,13.993z",
  },
  {
    name: "Bun",
    hex: "#000000",
    mono: true,
    path: "M12 22.596c6.628 0 12-4.338 12-9.688 0-3.318-2.057-6.248-5.219-7.986-1.286-.715-2.297-1.357-3.139-1.89C14.058 2.025 13.08 1.404 12 1.404c-1.097 0-2.334.785-3.966 1.821a49.92 49.92 0 0 1-2.816 1.697C2.057 6.66 0 9.59 0 12.908c0 5.35 5.372 9.687 12 9.687v.001ZM10.599 4.715c.334-.759.503-1.58.498-2.409 0-.145.202-.187.23-.029.658 2.783-.902 4.162-2.057 4.624-.124.048-.199-.121-.103-.209a5.763 5.763 0 0 0 1.432-1.977Zm2.058-.102a5.82 5.82 0 0 0-.782-2.306v-.016c-.069-.123.086-.263.185-.172 1.962 2.111 1.307 4.067.556 5.051-.082.103-.23-.003-.189-.126a5.85 5.85 0 0 0 .23-2.431Zm1.776-.561a5.727 5.727 0 0 0-1.612-1.806v-.014c-.112-.085-.024-.274.114-.218 2.595 1.087 2.774 3.18 2.459 4.407a.116.116 0 0 1-.049.071.11.11 0 0 1-.153-.026.122.122 0 0 1-.022-.083 5.891 5.891 0 0 0-.737-2.331Zm-5.087.561c-.617.546-1.282.76-2.063 1-.117 0-.195-.078-.156-.181 1.752-.909 2.376-1.649 2.999-2.778 0 0 .155-.118.188.085 0 .304-.349 1.329-.968 1.874Zm4.945 11.237a2.957 2.957 0 0 1-.937 1.553c-.346.346-.8.565-1.286.62a2.178 2.178 0 0 1-1.327-.62 2.955 2.955 0 0 1-.925-1.553.244.244 0 0 1 .064-.198.234.234 0 0 1 .193-.069h3.965a.226.226 0 0 1 .19.07c.05.053.073.125.063.197Zm-5.458-2.176a1.862 1.862 0 0 1-2.384-.245 1.98 1.98 0 0 1-.233-2.447c.207-.319.503-.566.848-.713a1.84 1.84 0 0 1 1.092-.11c.366.075.703.261.967.531a1.98 1.98 0 0 1 .408 2.114 1.931 1.931 0 0 1-.698.869v.001Zm8.495.005a1.86 1.86 0 0 1-2.381-.253 1.964 1.964 0 0 1-.547-1.366c0-.384.11-.76.32-1.079.207-.319.503-.567.849-.713a1.844 1.844 0 0 1 1.093-.108c.367.076.704.262.968.534a1.98 1.98 0 0 1 .4 2.117 1.932 1.932 0 0 1-.702.868Z",
  },
  {
    name: "Deno",
    hex: "#000000",
    mono: true,
    path: "M1.105 18.02A11.9 11.9 0 0 1 0 12.985q0-.698.078-1.376a12 12 0 0 1 .231-1.34A12 12 0 0 1 4.025 4.02a12 12 0 0 1 5.46-2.771 12 12 0 0 1 3.428-.23c1.452.112 2.825.477 4.077 1.05a12 12 0 0 1 2.78 1.774 12.02 12.02 0 0 1 4.053 7.078A12 12 0 0 1 24 12.985q0 .454-.036.914a12 12 0 0 1-.728 3.305 12 12 0 0 1-2.38 3.875c-1.33 1.357-3.02 1.962-4.43 1.936a4.4 4.4 0 0 1-2.724-1.024c-.99-.853-1.391-1.83-1.53-2.919a5 5 0 0 1 .128-1.518c.105-.38.37-1.116.76-1.437-.455-.197-1.04-.624-1.226-.829-.045-.05-.04-.13 0-.183a.155.155 0 0 1 .177-.053c.392.134.869.267 1.372.35.66.111 1.484.25 2.317.292 2.03.1 4.153-.813 4.812-2.627s.403-3.609-1.96-4.685-3.454-2.356-5.363-3.128c-1.247-.505-2.636-.205-4.06.582-3.838 2.121-7.277 8.822-5.69 15.032a.191.191 0 0 1-.315.19 12 12 0 0 1-1.25-1.634 12 12 0 0 1-.769-1.404M11.57 6.087c.649-.051 1.214.501 1.31 1.236.13.979-.228 1.99-1.41 2.013-1.01.02-1.315-.997-1.248-1.614.066-.616.574-1.575 1.35-1.635",
  },
  {
    name: "Cloudflare",
    hex: "#F38020",
    path: "M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713c-.0283-.042-.0351-.0986-.021-.1553.0278-.084.1123-.1484.2036-.1562l8.7359-.1123c1.0351-.0489 2.1601-.8868 2.5537-1.9136l.499-1.3013c.0215-.0561.0293-.1128.0147-.168-.5625-2.5463-2.835-4.4453-5.5499-4.4453-2.5039 0-4.6284 1.6177-5.3876 3.8614-.4927-.3658-1.1187-.5625-1.794-.499-1.2026.119-2.1665 1.083-2.2861 2.2856-.0283.31-.0069.6128.0635.894C1.5683 13.171 0 14.7754 0 16.752c0 .1748.0142.3515.0352.5273.0141.083.0844.1475.1689.1475h15.9814c.0909 0 .1758-.0645.2032-.1553l.12-.4268zm2.7568-5.5634c-.0771 0-.1611 0-.2383.0112-.0566 0-.1054.0415-.127.0976l-.3378 1.1744c-.1475.5068-.0918.9707.1543 1.3164.2256.3164.6055.498 1.0625.5195l1.8437.1133c.0557 0 .1055.0263.1329.0703.0283.043.0351.1074.0214.1562-.0283.084-.1132.1485-.204.1553l-1.921.1123c-1.041.0488-2.1582.8867-2.5527 1.914l-.1406.3585c-.0283.0713.0215.1416.0986.1416h6.5977c.0771 0 .1474-.0489.169-.126.1122-.4082.1757-.837.1757-1.2803 0-2.6025-2.125-4.727-4.7344-4.727",
  },
  {
    name: "Vercel",
    hex: "#000000",
    mono: true,
    path: "m12 1.608 12 20.784H0Z",
  },
  {
    name: "Netlify",
    hex: "#00C7B7",
    path: "M6.49 19.04h-.23L5.13 17.9v-.23l1.73-1.71h1.2l.15.15v1.2L6.5 19.04ZM5.13 6.31V6.1l1.13-1.13h.23L8.2 6.68v1.2l-.15.15h-1.2L5.13 6.31Zm9.96 9.09h-1.65l-.14-.13v-3.83c0-.68-.27-1.2-1.1-1.23-.42 0-.9 0-1.43.02l-.07.08v4.96l-.14.14H8.9l-.13-.14V8.73l.13-.14h3.7a2.6 2.6 0 0 1 2.61 2.6v4.08l-.13.14Zm-8.37-2.44H.14L0 12.82v-1.64l.14-.14h6.58l.14.14v1.64l-.14.14Zm17.14 0h-6.58l-.14-.14v-1.64l.14-.14h6.58l.14.14v1.64l-.14.14ZM11.05 6.55V1.64l.14-.14h1.65l.14.14v4.9l-.14.14h-1.65l-.14-.13Zm0 15.81v-4.9l.14-.14h1.65l.14.13v4.91l-.14.14h-1.65l-.14-.14Z",
  },
  {
    name: "Electron",
    hex: "#47848F",
    path: "M12.0111 0c-.85 0-1.5392.6891-1.5392 1.5392 0 .8501.6891 1.5393 1.5392 1.5393.595 0 1.11-.338 1.3662-.832 2.2208 1.2675 3.847 5.4728 3.847 10.3623 0 2.0715-.2891 4.056-.825 5.7685a.3215.3215 0 0 0 .2107.403.322.322 0 0 0 .4033-.2111c.5558-1.7763.8542-3.8251.8542-5.9604 0-5.1927-1.7717-9.686-4.3206-11.0027.001-.0223.0035-.0443.0035-.0669 0-.85-.6891-1.5392-1.5393-1.5392zm0 .6432a.896.896 0 1 1 0 1.792.896.896 0 1 1 0-1.792zm-5.486 4.3052c-2.067.0074-3.6473.6646-4.3885 1.9485-.7375 1.2774-.5267 2.971.5113 4.7813a.3217.3217 0 0 0 .558-.32C2.271 9.7274 2.089 8.266 2.6938 7.2185c.821-1.422 3.033-1.9552 5.9321-1.4271a.3216.3216 0 0 0 .1153-.6329c-.784-.1428-1.5271-.2125-2.216-.21zm11.0522.0176a.3216.3216 0 0 0-.0084.6432c1.8337.0239 3.1556.5956 3.7502 1.6256.8192 1.419.1798 3.5947-1.7182 5.837a.322.322 0 0 0 .0377.4535.3215.3215 0 0 0 .4532-.0377c2.0535-2.426 2.7708-4.8661 1.7845-6.5744-.7257-1.257-2.26-1.9207-4.299-1.9472zm-2.6984.2924a.3225.3225 0 0 0-.0647.0072c-1.8568.3979-3.8333 1.1755-5.7314 2.2714-4.5699 2.6384-7.5924 6.4948-7.3601 9.3717-.4726.2628-.7928.7664-.7928 1.3455 0 .85.6892 1.5392 1.5393 1.5392.85 0 1.5392-.6891 1.5392-1.5392 0-.8501-.6891-1.5393-1.5392-1.5393-.038 0-.0754.003-.1128.0057-.1002-2.5597 2.7434-6.1412 7.048-8.6265 1.8413-1.063 3.7551-1.8163 5.5445-2.1997a.3217.3217 0 0 0-.07-.636zm-2.8787 6.2364a1.1192 1.1192 0 0 0-.2243.0255c-.6012.1301-.983.7225-.8533 1.3238.1302.6012.7226.9832 1.3238.8533.6012-.1302.9832-.7226.8533-1.3238-.1139-.526-.5816-.8844-1.0995-.8788zM4.532 13.341a.321.321 0 0 0-.2318.0835.3214.3214 0 0 0-.0214.4542c1.2682 1.3936 2.9157 2.701 4.7946 3.7857 4.4146 2.5489 9.1056 3.2849 11.5608 1.8392a1.53 1.53 0 0 0 .8966.2899c.8501 0 1.5392-.6891 1.5392-1.5392 0-.8501-.689-1.5393-1.5392-1.5393-.85 0-1.5392.6892-1.5392 1.5393 0 .276.0737.5344.201.7584-2.2448 1.214-6.631.5002-10.7976-1.9054-1.8228-1.0524-3.418-2.3181-4.6404-3.6614a.3206.3206 0 0 0-.2226-.1049zm-2.0628 4.0172a.896.896 0 1 1 0 1.792.896.896 0 1 1 0-1.792zm19.0616 0a.896.896 0 1 1 0 1.792.891.891 0 0 1-.5864-.2194c-.0025-.004-.0039-.0083-.0066-.0123a.3195.3195 0 0 0-.0957-.0914.896.896 0 0 1 .6887-1.4689zm-14.0045 1.368a.3215.3215 0 0 0-.3207.4296C8.2793 22.154 10.036 24 12.0111 24c1.4406 0 2.7735-.9822 3.8128-2.711a.3215.3215 0 0 0-.11-.4413.3219.3219 0 0 0-.4415.11c-.934 1.5537-2.0812 2.399-3.2613 2.399-1.6407 0-3.2075-1.6465-4.2-4.4179a.3216.3216 0 0 0-.2848-.2126z",
  },
  {
    name: "Chrome",
    hex: "#4285F4",
    path: "M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z",
  },
  {
    name: "Firefox",
    hex: "#FF7139",
    path: "M8.824 7.287c.008 0 .004 0 0 0zm-2.8-1.4c.006 0 .003 0 0 0zm16.754 2.161c-.505-1.215-1.53-2.528-2.333-2.943.654 1.283 1.033 2.57 1.177 3.53l.002.02c-1.314-3.278-3.544-4.6-5.366-7.477-.091-.147-.184-.292-.273-.446a3.545 3.545 0 01-.13-.24 2.118 2.118 0 01-.172-.46.03.03 0 00-.027-.03.038.038 0 00-.021 0l-.006.001a.037.037 0 00-.01.005L15.624 0c-2.585 1.515-3.657 4.168-3.932 5.856a6.197 6.197 0 00-2.305.587.297.297 0 00-.147.37c.057.162.24.24.396.17a5.622 5.622 0 012.008-.523l.067-.005a5.847 5.847 0 011.957.222l.095.03a5.816 5.816 0 01.616.228c.08.036.16.073.238.112l.107.055a5.835 5.835 0 01.368.211 5.953 5.953 0 012.034 2.104c-.62-.437-1.733-.868-2.803-.681 4.183 2.09 3.06 9.292-2.737 9.02a5.164 5.164 0 01-1.513-.292 4.42 4.42 0 01-.538-.232c-1.42-.735-2.593-2.121-2.74-3.806 0 0 .537-2 3.845-2 .357 0 1.38-.998 1.398-1.287-.005-.095-2.029-.9-2.817-1.677-.422-.416-.622-.616-.8-.767a3.47 3.47 0 00-.301-.227 5.388 5.388 0 01-.032-2.842c-1.195.544-2.124 1.403-2.8 2.163h-.006c-.46-.584-.428-2.51-.402-2.913-.006-.025-.343.176-.389.206-.406.29-.787.616-1.136.974-.397.403-.76.839-1.085 1.303a9.816 9.816 0 00-1.562 3.52c-.003.013-.11.487-.19 1.073-.013.09-.026.181-.037.272a7.8 7.8 0 00-.069.667l-.002.034-.023.387-.001.06C.386 18.795 5.593 24 12.016 24c5.752 0 10.527-4.176 11.463-9.661.02-.149.035-.298.052-.448.232-1.994-.025-4.09-.753-5.844z",
  },
  {
    name: "React Native",
    hex: "#61DAFB",
    path: "M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z",
  },
  {
    name: "Expo",
    hex: "#1C2024",
    mono: true,
    path: "M0 20.084c.043.53.23 1.063.718 1.778.58.849 1.576 1.315 2.303.567.49-.505 5.794-9.776 8.35-13.29a.761.761 0 011.248 0c2.556 3.514 7.86 12.785 8.35 13.29.727.748 1.723.282 2.303-.567.57-.835.728-1.42.728-2.046 0-.426-8.26-15.798-9.092-17.078-.8-1.23-1.044-1.498-2.397-1.542h-1.032c-1.353.044-1.597.311-2.398 1.542C8.267 3.991.33 18.758 0 19.77Z",
  },
  {
    name: "Vite",
    hex: "#9135FF",
    path: "M13.056 23.238a.57.57 0 0 1-1.02-.355v-5.202c0-.63-.512-1.143-1.144-1.143H5.148a.57.57 0 0 1-.464-.903l3.777-5.29c.54-.753 0-1.804-.93-1.804H.57a.574.574 0 0 1-.543-.746.6.6 0 0 1 .08-.157L5.008.78a.57.57 0 0 1 .467-.24h14.589a.57.57 0 0 1 .466.903l-3.778 5.29c-.54.755 0 1.806.93 1.806h5.745c.238 0 .424.138.513.322a.56.56 0 0 1-.063.603z",
  },
  {
    name: "WebAssembly",
    hex: "#654FF0",
    path: "M14.745,0c0,0.042,0,0.085,0,0.129c0,1.52-1.232,2.752-2.752,2.752c-1.52,0-2.752-1.232-2.752-2.752 c0-0.045,0-0.087,0-0.129H0v24h24V0H14.745z M11.454,21.431l-1.169-5.783h-0.02l-1.264,5.783H7.39l-1.824-8.497h1.59l1.088,5.783 h0.02l1.311-5.783h1.487l1.177,5.854h0.02l1.242-5.854h1.561l-2.027,8.497H11.454z M20.209,21.431l-0.542-1.891h-2.861l-0.417,1.891 h-1.59l2.056-8.497h2.509l2.5,8.497H20.209z M17.812,15.028l-0.694,3.118h2.159l-0.796-3.118H17.812z",
  },
  {
    name: "Tauri",
    hex: "#24C8D8",
    path: "M13.912 0a8.72 8.72 0 0 0-8.308 6.139c1.05-.515 2.18-.845 3.342-.976 2.415-3.363 7.4-3.412 9.88-.097 2.48 3.315 1.025 8.084-2.883 9.45a6.131 6.131 0 0 1-.3 2.762 8.72 8.72 0 0 0 3.01-1.225A8.72 8.72 0 0 0 13.913 0zm.082 6.451a2.284 2.284 0 1 0-.15 4.566 2.284 2.284 0 0 0 .15-4.566zm-5.629.27a8.72 8.72 0 0 0-3.031 1.235 8.72 8.72 0 1 0 13.06 9.9131 10.173 10.174 0 0 1-3.343.965 6.125 6.125 0 1 1-7.028-9.343 6.114 6.115 0 0 1 .342-2.772zm1.713 6.27a2.284 2.284 0 0 0-2.284 2.283 2.284 2.284 0 0 0 2.284 2.284 2.284 2.284 0 0 0 2.284-2.284 2.284 2.284 0 0 0-2.284-2.284z",
  },
];

function RuntimeLogo({ runtime }: { runtime: Runtime }) {
  return (
    <div
      className="group text-fd-muted-foreground hover:text-fd-foreground flex flex-col items-center gap-2 transition-colors"
      title={runtime.name}
    >
      <svg
        role="img"
        viewBox="0 0 24 24"
        aria-hidden
        className="h-7 w-7 fill-current opacity-60 grayscale transition-all group-hover:opacity-100 group-hover:grayscale-0"
        style={runtime.mono ? undefined : { color: runtime.hex }}
      >
        <path d={runtime.path} />
      </svg>
      <span className="text-xs font-medium">{runtime.name}</span>
    </div>
  );
}

function RuntimeWall() {
  return (
    <section className="border-fd-border border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            One API, every runtime
          </h2>
          <p className="text-fd-muted-foreground max-w-2xl text-pretty">
            One cache API across Node, Bun, Deno, browsers, and the edge — same{" "}
            <code className="font-mono text-[0.9em]">get</code>, same{" "}
            <code className="font-mono text-[0.9em]">set</code>, same TTL. No
            polyfills, no adapters.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-x-6 gap-y-10 sm:grid-cols-4 md:grid-cols-7">
          {runtimes.map((r) => (
            <RuntimeLogo key={r.name} runtime={r} />
          ))}
        </div>

        <p className="text-fd-muted-foreground mx-auto mt-12 max-w-2xl text-center text-sm text-pretty">
          Browsers reach for IndexedDB, servers for memory or the filesystem —
          Nova picks the right store, or you swap in your own. The API never
          changes.
        </p>
      </div>
    </section>
  );
}

// Inline icons (heroicons-style, currentColor), tinted with a semantic token.
const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ttlIcon = (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const storeIcon = (
  <svg {...iconProps}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
    <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
  </svg>
);
const typeIcon = (
  <svg {...iconProps}>
    <path d="m8 9-3 3 3 3" />
    <path d="m16 9 3 3-3 3" />
    <path d="m13.5 7-3 10" />
  </svg>
);
const zeroIcon = (
  <svg {...iconProps}>
    <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z" />
    <path d="M3 7.5 12 12l9-4.5" />
    <path d="M12 12v9" />
  </svg>
);

function FeatureIcon({
  icon,
  color,
}: {
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className={`bg-fd-muted w-fit rounded-lg border p-2 shadow-sm [&_svg]:size-5 ${color}`}
    >
      {icon}
    </div>
  );
}

function FeatureGrid() {
  return (
    <section className="border-fd-border border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Meet your new cache layer
          </h2>
          <p className="text-fd-muted-foreground max-w-2xl text-pretty">
            A cache is easy to start and annoying to finish. Nova ships the
            parts you always end up writing anyway — expiry, storage, types —
            behind one small API.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* TTL */}
          <article className="bg-fd-card hover:border-fd-foreground/20 flex flex-col gap-4 rounded-2xl border p-7 transition-colors lg:col-span-3">
            <FeatureIcon icon={ttlIcon} color="text-fd-warning" />
            <h3 className="text-lg font-semibold tracking-tight">
              TTL &amp; expiry, built in
            </h3>
            <p className="text-fd-muted-foreground text-pretty">
              Time-to-live per entry or per cache. Stale keys expire on their
              own — no cron, no manual sweeps.
            </p>
          </article>

          {/* Type-safe */}
          <article className="bg-fd-card hover:border-fd-foreground/20 flex flex-col gap-4 rounded-2xl border p-7 transition-colors lg:col-span-3">
            <FeatureIcon icon={typeIcon} color="text-fd-idea" />
            <h3 className="text-lg font-semibold tracking-tight">
              Type-safe by default
            </h3>
            <p className="text-fd-muted-foreground text-pretty">
              <code className="font-mono text-[0.9em]">get</code> and{" "}
              <code className="font-mono text-[0.9em]">set</code> are fully
              generic — your value types flow through end to end.
            </p>
          </article>

          {/* Featured: pluggable stores — wide */}
          <article className="bg-fd-card hover:border-fd-foreground/20 group relative flex flex-col gap-5 overflow-hidden rounded-2xl border p-7 transition-colors sm:col-span-2 lg:col-span-4">
            <FeatureIcon icon={storeIcon} color="text-fd-info" />
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold tracking-tight">
                Pluggable stores
              </h3>
              <p className="text-fd-muted-foreground max-w-md text-pretty">
                Memory, filesystem, IndexedDB — or write your own in an
                afternoon. Swap the backend without touching a single call site.
              </p>
            </div>
            <div className="mt-auto grid gap-2 pt-2 sm:grid-cols-2">
              {stores.map((s) => (
                <div
                  key={s.name}
                  className="bg-fd-muted/50 flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-xs"
                >
                  <span className="bg-fd-info size-1.5 shrink-0 rounded-full" />
                  <span className="text-fd-foreground">{s.name}</span>
                </div>
              ))}
            </div>
          </article>

          {/* Zero deps — narrow vertical accent */}
          <article className="bg-fd-card hover:border-fd-foreground/20 relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-7 transition-colors sm:col-span-2 lg:col-span-2">
            <FeatureIcon icon={zeroIcon} color="text-fd-success" />
            <h3 className="text-lg font-semibold tracking-tight">
              Zero dependencies
            </h3>
            <p className="text-fd-muted-foreground text-pretty">
              Nothing in your{" "}
              <code className="font-mono text-[0.9em]">node_modules</code> but
              Nova. A surface you can read in one sitting.
            </p>
            <div
              aria-hidden
              className="text-fd-success/10 pointer-events-none absolute -right-2 -bottom-6 text-9xl leading-none font-bold tracking-tighter select-none"
            >
              0
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 4 — The Problem
//
// The libraries are deliberately unnamed: the point is ecosystem fragmentation,
// not that any particular library is a bad choice. The honest, named comparison
// belongs further down the page.
//
// The diagram animates with CSS only (dash-offset pulses), so this stays a
// server component. Each branch runs on its own duration so the three streams
// never sync up — that lack of rhythm *is* the message.
// ---------------------------------------------------------------------------

// Every path carries pathLength=100, so the dash maths below is independent of
// actual geometry: a 12-unit dash travels from just before the start (offset
// 424) to just past the end (offset 312). Starting at 464 adds an idle beat.
const problemCss = `
@keyframes nova-pulse {
  from { stroke-dashoffset: 464; }
  to   { stroke-dashoffset: 312; }
}
@keyframes nova-land {
  0%, 84% { opacity: 0; }
  92%     { opacity: 1; }
  100%    { opacity: 0; }
}
.nova-pulse {
  stroke-dasharray: 12 400;
  animation-name: nova-pulse;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.nova-land {
  opacity: 0;
  animation-name: nova-land;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.nova-diagram:hover .nova-pulse,
.nova-diagram:hover .nova-land {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .nova-pulse, .nova-land { animation-name: none; }
  .nova-pulse { stroke-dasharray: none; opacity: 0.4; }
}
`;

const line = {
  fill: "none",
  stroke: "var(--color-fd-border)",
  strokeWidth: 1.5,
} as const;

const branches = [
  {
    // elbow left, lands on the left node at x=65
    path: "M150 54 V80 Q150 90 140 90 H75 Q65 90 65 100 V140",
    dash: undefined, // solid
    seconds: 3.4,
    node: { x: 5, label: "Memory", library: "Library A", ttl: "ttl: 60" },
  },
  {
    path: "M200 54 V140",
    dash: "5 4",
    seconds: 2.6,
    node: {
      x: 140,
      label: "Filesystem",
      library: "Library B",
      ttl: "ttl: 60000",
    },
  },
  {
    // elbow right, lands on the right node at x=335
    path: "M250 54 V80 Q250 90 260 90 H325 Q335 90 335 100 V140",
    dash: "2 3",
    seconds: 4.2,
    node: {
      x: 275,
      label: "IndexedDB",
      library: "Library C",
      ttl: "expiresAt",
    },
  },
];

function FragmentedDiagram() {
  return (
    <svg
      viewBox="0 0 400 232"
      role="img"
      aria-label="One application wired to three separate caches — memory, filesystem and IndexedDB — each backed by a different library with its own TTL option."
      className="nova-diagram w-full max-w-lg"
    >
      {/* the application */}
      <rect
        x={125}
        y={10}
        width={150}
        height={44}
        rx={10}
        fill="var(--color-fd-card)"
        stroke="var(--color-fd-border)"
      />
      <text
        x={200}
        y={37}
        textAnchor="middle"
        className="font-mono text-[11px] tracking-wide"
        fill="var(--color-fd-foreground)"
      >
        YOUR APPLICATION
      </text>

      {/* connectors — a different dash pattern per branch, because none of
          these three integrations look alike */}
      {branches.map((b) => (
        <path
          key={b.node.label}
          d={b.path}
          {...line}
          strokeDasharray={b.dash}
          opacity={0.7}
        />
      ))}

      {/* the caches */}
      {branches.map((b) => (
        <g key={b.node.label}>
          <rect
            x={b.node.x}
            y={140}
            width={120}
            height={58}
            rx={10}
            fill="var(--color-fd-card)"
            stroke="var(--color-fd-border)"
            strokeDasharray="5 4"
          />
          <text
            x={b.node.x + 60}
            y={166}
            textAnchor="middle"
            className="text-[14px] font-semibold"
            fill="var(--color-fd-foreground)"
          >
            {b.node.label}
          </text>
          <text
            x={b.node.x + 60}
            y={184}
            textAnchor="middle"
            className="font-mono text-[11px]"
            fill="var(--color-fd-muted-foreground)"
          >
            {b.node.library}
          </text>
          <text
            x={b.node.x + 60}
            y={220}
            textAnchor="middle"
            className="font-mono text-[11px]"
            fill="var(--color-fd-muted-foreground)"
          >
            {b.node.ttl}
          </text>
        </g>
      ))}

      {/* travelling pulse + the outline that lights up when it lands */}
      {branches.map((b) => (
        <g key={b.node.label}>
          <path
            d={b.path}
            pathLength={100}
            fill="none"
            stroke="var(--color-fd-foreground)"
            strokeWidth={2}
            strokeLinecap="round"
            className="nova-pulse"
            style={{ animationDuration: `${b.seconds}s` }}
          />
          <rect
            x={b.node.x}
            y={140}
            width={120}
            height={58}
            rx={10}
            fill="none"
            stroke="var(--color-fd-foreground)"
            strokeWidth={1.5}
            className="nova-land"
            style={{ animationDuration: `${b.seconds}s` }}
          />
        </g>
      ))}
    </svg>
  );
}

function ProblemSection() {
  return (
    <section className="border-fd-border border-t">
      <style>{problemCss}</style>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-5">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Caching shouldn&rsquo;t be different in every environment
          </h2>
          <p className="text-fd-muted-foreground max-w-lg text-pretty">
            In-memory, filesystem, IndexedDB — each one usually means reaching
            for a different library. Different APIs. Different TTL semantics.
            Different features. Different things to learn.
          </p>
          <p className="max-w-lg font-medium text-pretty">
            Your caching strategy shouldn&rsquo;t change just because your
            storage does.
          </p>
        </div>

        <figure className="flex flex-col items-center gap-5 lg:items-end">
          <FragmentedDiagram />
          <figcaption className="text-fd-muted-foreground text-center text-sm text-pretty lg:text-right">
            Same problem. Three libraries. Three sets of semantics.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 5 — The Solution
//
// Instead of another node-and-connector diagram (Section 4 already owns that
// shape), the argument is made with a segmented control wired to a code panel:
// clicking a store swaps *only* the `store:` line below — the set/get calls
// never move. That's the one interactive island on the page; see
// components/store-toggle.tsx.
// ---------------------------------------------------------------------------

function SolutionSection() {
  return (
    <section className="border-fd-border border-t">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <figure className="order-last flex flex-col items-center gap-5 lg:order-first lg:items-start">
          <StoreToggle />
          <figcaption className="text-fd-muted-foreground text-center text-sm text-pretty lg:text-left">
            Flip the store. The{" "}
            <code className="font-mono text-[0.9em]">get</code> and{" "}
            <code className="font-mono text-[0.9em]">set</code> calls never
            move.
          </figcaption>
        </figure>

        <div className="flex flex-col items-start gap-5">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            One cache API. Any storage.
          </h2>
          <p className="text-fd-muted-foreground max-w-lg text-pretty">
            Nova separates your caching logic from where the data lives. Use the
            same API whether you&rsquo;re caching in memory, on the filesystem,
            in IndexedDB, or in your own store — storage is just an
            implementation detail.
          </p>
          <p className="max-w-lg font-medium text-pretty">
            Change where your cache lives. Not how you use it.
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 6 — wrap()
//
// The visual is a two-lane flow, not another SVG node graph: a cache HIT is a
// single step (return the cached value), while a MISS is the three steps Nova
// runs *for you* — run → store → return. The miss lane's steps light up in
// sequence (pure CSS, staggered delays) so the flow Nova automates is obvious.
// ---------------------------------------------------------------------------

const NOVA_WRAP_STEPS = 3;
const WRAP_CYCLE = 3.6; // seconds for one run → store → return sweep

const wrapCss = `
@keyframes nova-step {
  0%, 12%  { border-color: var(--color-fd-border); color: var(--color-fd-muted-foreground); background-color: var(--color-fd-card); }
  18%, 30% { border-color: var(--color-fd-info); color: var(--color-fd-foreground); background-color: var(--color-fd-accent); }
  40%, 100% { border-color: var(--color-fd-border); color: var(--color-fd-muted-foreground); background-color: var(--color-fd-card); }
}
.nova-step { animation: nova-step ${WRAP_CYCLE}s linear infinite; }
.nova-flow:hover .nova-step { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .nova-step { animation: none; }
}
`;

function Connector() {
  return <span aria-hidden className="bg-fd-border h-4 w-px" />;
}

function StepCard({
  children,
  index,
  className = "",
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  const animated = typeof index === "number";
  return (
    <div
      className={`w-full rounded-lg border px-3 py-2 text-center font-mono text-xs ${
        animated ? "nova-step" : "bg-fd-card text-fd-foreground"
      } ${className}`}
      style={
        animated
          ? { animationDelay: `${(index! / NOVA_WRAP_STEPS) * WRAP_CYCLE}s` }
          : undefined
      }
    >
      {children}
    </div>
  );
}

function WrapFlow() {
  return (
    <div
      className="nova-flow flex w-full max-w-md flex-col items-center"
      role="img"
      aria-label="cache.wrap branches on the cache. A hit returns the stored value in one step; a miss runs the function, stores the result, then returns it — three steps Nova handles for you."
    >
      {/* the call */}
      <div className="bg-fd-info text-fd-background rounded-lg px-4 py-2 font-mono text-sm font-medium">
        cache.wrap(key, fn)
      </div>
      <Connector />

      {/* the branch */}
      <div className="grid w-full grid-cols-2 gap-4">
        {/* HIT — one step */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-fd-success bg-fd-success/10 border-fd-success/30 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
            cache hit
          </span>
          <Connector />
          <StepCard className="border-fd-success/40 text-fd-foreground!">
            return cached value
          </StepCard>
        </div>

        {/* MISS — the three steps Nova runs for you */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-fd-warning bg-fd-warning/10 border-fd-warning/30 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
            cache miss
          </span>
          <Connector />
          <StepCard index={0}>run function</StepCard>
          <Connector />
          <StepCard index={1}>store result</StepCard>
          <Connector />
          <StepCard index={2}>return value</StepCard>
        </div>
      </div>
    </div>
  );
}

function WrapCode() {
  return (
    <figure className="bg-fd-card w-full max-w-lg overflow-hidden rounded-xl border shadow-sm">
      <figcaption className="text-fd-muted-foreground flex h-9.5 items-center border-b px-4">
        <span className="font-mono text-xs">user.ts</span>
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6">
        <code className="grid">
          <span>
            <span className={tok.comment}>
              {"// hit → cached value; miss → run, store, return"}
            </span>
          </span>
          <span>
            <span className={tok.kw}>const</span>{" "}
            <span className={tok.plain}>user =</span>{" "}
            <span className={tok.kw}>await</span>{" "}
            <span className={tok.plain}>cache.</span>
            <span className={tok.fn}>wrap</span>
            <span className={tok.plain}>(</span>
            <span className={tok.str}>&quot;user:123&quot;</span>
            <span className={tok.plain}>, () =&gt; </span>
            <span className={tok.fn}>fetchUser</span>
            <span className={tok.plain}>(</span>
            <span className={tok.str}>&quot;123&quot;</span>
            <span className={tok.plain}>));</span>
          </span>
        </code>
      </pre>
    </figure>
  );
}

function EscapeHatch({ option, desc }: { option: string; desc: string }) {
  return (
    <div className="bg-fd-card flex flex-col gap-1.5 rounded-lg border p-3">
      <code className="font-mono text-xs">
        <span className="text-fd-muted-foreground">wrap(key, fn, {"{ "}</span>
        <span className={tok.fn}>{option}</span>
        <span className="text-fd-muted-foreground">: </span>
        <span className={tok.kw}>true</span>
        <span className="text-fd-muted-foreground">{" }"})</span>
      </code>
      <span className="text-fd-muted-foreground text-xs text-pretty">
        {desc}
      </span>
    </div>
  );
}

function WrapSection() {
  return (
    <section className="border-fd-border border-t">
      <style>{wrapCss}</style>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-5">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Memoize the expensive stuff.
          </h2>
          <p className="text-fd-muted-foreground max-w-lg text-pretty">
            Wrap an expensive operation and Nova handles the rest. On a cache
            hit, you get the stored result. On a miss, Nova runs the function,
            stores the result, and returns it.
          </p>
          <WrapCode />
          <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2">
            <EscapeHatch
              option="forceRefresh"
              desc="Run the function and refresh the cached value."
            />
            <EscapeHatch
              option="disableCache"
              desc="Bypass caching entirely — just run the function."
            />
          </div>
        </div>

        <figure className="flex flex-col items-center gap-5">
          <WrapFlow />
          <figcaption className="text-fd-muted-foreground text-center text-sm text-pretty">
            No manual check, run, store, return. One call covers both paths.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 7 — TTL
//
// Visual: one default TTL at the top feeding a list of entries. Most rows just
// inherit the default (muted, same value); the two overrides stand out in
// their own colors — a custom lifetime and a never-expires ∞. The design makes
// "configure the common case once, override per-entry" legible at a glance.
// No animation needed here; the contrast carries it.
// ---------------------------------------------------------------------------

type TtlRow = {
  key: string;
  value: string;
  kind: "inherit" | "override" | "forever";
};

const ttlRows: TtlRow[] = [
  { key: "user:123", value: "60s", kind: "inherit" },
  { key: "posts:123", value: "60s", kind: "inherit" },
  { key: "weather", value: "60s", kind: "inherit" },
  { key: "config", value: "1 hour", kind: "override" },
  { key: "static-data", value: "∞", kind: "forever" },
];

const ttlBadge: Record<TtlRow["kind"], string> = {
  inherit: "text-fd-muted-foreground bg-fd-muted border-fd-border",
  override: "text-fd-warning bg-fd-warning/10 border-fd-warning/30",
  forever: "text-fd-info bg-fd-info/10 border-fd-info/30",
};

function TtlDiagram() {
  return (
    <div
      className="flex w-full max-w-sm flex-col items-center gap-3"
      role="img"
      aria-label="A default TTL of 60 seconds applies to every entry. Individual entries can override it — config lives one hour, static-data never expires."
    >
      {/* the default */}
      <div className="bg-fd-card flex items-center gap-3 rounded-xl border px-5 py-3 shadow-sm">
        <span className="text-fd-muted-foreground text-xs font-medium tracking-wide uppercase">
          Default
        </span>
        <span className="font-mono text-lg font-semibold">60s</span>
      </div>
      <span aria-hidden className="bg-fd-border h-4 w-px" />

      {/* the entries */}
      <div className="flex w-full flex-col gap-2">
        {ttlRows.map((row) => (
          <div
            key={row.key}
            className="bg-fd-card flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5"
          >
            <code className="font-mono text-xs">{row.key}</code>
            <span className="flex items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 font-mono text-xs font-medium ${ttlBadge[row.kind]}`}
              >
                {row.value}
              </span>
              {row.kind !== "inherit" && (
                <span className="text-fd-muted-foreground text-[10px] tracking-wide uppercase">
                  {row.kind === "forever" ? "never expires" : "override"}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TtlCode() {
  return (
    <figure className="bg-fd-card w-full max-w-lg overflow-hidden rounded-xl border shadow-sm">
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
          <span>
            <span className={tok.plain}>{"  "}store:</span>{" "}
            <span className={tok.kw}>new</span>{" "}
            <span className={tok.fn}>MemoryStore</span>
            <span className={tok.plain}>(),</span>
          </span>
          <span>
            <span className={tok.plain}>{"  "}ttl:</span>{" "}
            <span className={tok.num}>60_000</span>
            <span className={tok.plain}>,</span>{" "}
            <span className={tok.comment}>{"// default: 1 minute"}</span>
          </span>
          <span className={tok.plain}>{"});"}</span>
          <span>&nbsp;</span>
          <span>
            <span className={tok.comment}>{"// inherit the default"}</span>
          </span>
          <span>
            <span className={tok.kw}>await</span>{" "}
            <span className={tok.plain}>cache.</span>
            <span className={tok.fn}>set</span>
            <span className={tok.plain}>(</span>
            <span className={tok.str}>&quot;user:123&quot;</span>
            <span className={tok.plain}>, user);</span>
          </span>
          <span>&nbsp;</span>
          <span>
            <span className={tok.comment}>{"// override per entry"}</span>
          </span>
          <span>
            <span className={tok.kw}>await</span>{" "}
            <span className={tok.plain}>cache.</span>
            <span className={tok.fn}>set</span>
            <span className={tok.plain}>(</span>
            <span className={tok.str}>&quot;config&quot;</span>
            <span className={tok.plain}>, config, </span>
            <span className={tok.num}>60</span>
            <span className={tok.plain}> * </span>
            <span className={tok.num}>60_000</span>
            <span className={tok.plain}>);</span>
          </span>
          <span>
            <span className={tok.kw}>await</span>{" "}
            <span className={tok.plain}>cache.</span>
            <span className={tok.fn}>set</span>
            <span className={tok.plain}>(</span>
            <span className={tok.str}>&quot;static-data&quot;</span>
            <span className={tok.plain}>, data, </span>
            <span className={tok.num}>0</span>
            <span className={tok.plain}>);</span>{" "}
            <span className={tok.comment}>{"// never expires"}</span>
          </span>
        </code>
      </pre>
    </figure>
  );
}

function TtlSection() {
  return (
    <section className="border-fd-border border-t">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <figure className="order-last flex flex-col items-center gap-5 lg:order-first">
          <TtlDiagram />
          <figcaption className="text-fd-muted-foreground text-center text-sm text-pretty">
            One default. Per-entry control when you need it.
          </figcaption>
        </figure>

        <div className="flex flex-col items-start gap-5">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Set your TTL once. Override it anywhere.
          </h2>
          <p className="text-fd-muted-foreground max-w-lg text-pretty">
            Set a default TTL once and Nova applies it to everything you cache.
            Override it when an entry needs a different lifetime — or set it to{" "}
            <code className="font-mono text-[0.9em]">0</code> when it should
            never expire.
          </p>
          <TtlCode />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 8 — Comparison
//
// An honest positioning table, not a scoreboard. The point is Nova's tradeoff
// (cross-runtime API + storage as a detail), not that it beats anything. Nova's
// column is tinted to anchor the eye; the rest are neutral. No download counts.
// ---------------------------------------------------------------------------

type Cell = "yes" | "no" | string;

const compareLibs = ["lru-cache", "Keyv", "cache-manager", "node-cache"];

const compareRows: { label: string; nova: Cell; others: Cell[] }[] = [
  { label: "Node.js", nova: "yes", others: ["yes", "yes", "yes", "yes"] },
  { label: "Browser", nova: "yes", others: ["yes", "no", "no", "no"] },
  {
    label: "Other JS runtimes",
    nova: "yes",
    others: ["Partial", "Best effort", "no", "no"],
  },
  {
    label: "Pluggable storage",
    nova: "yes",
    others: ["no", "yes", "yes", "no"],
  },
  { label: "Built-in TTL", nova: "yes", others: ["yes", "yes", "yes", "yes"] },
  { label: "Per-entry TTL", nova: "yes", others: ["yes", "yes", "yes", "yes"] },
  {
    label: "wrap() async functions",
    nova: "yes",
    others: ["no", "no", "yes", "no"],
  },
  {
    label: "Filesystem storage",
    nova: "yes",
    others: ["no", "Adapter", "Adapter", "no"],
  },
  {
    label: "Primary focus",
    nova: "Cross-runtime cache abstraction",
    others: [
      "In-memory LRU",
      "Key-value storage",
      "Node.js cache manager",
      "Node.js memory cache",
    ],
  },
];

const checkIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function CompareCell({ value, emphasis }: { value: Cell; emphasis?: boolean }) {
  if (value === "yes") {
    return (
      <span className="inline-flex">
        <span className={emphasis ? "text-fd-info" : "text-fd-success"}>
          {checkIcon}
        </span>
      </span>
    );
  }
  if (value === "no") {
    return (
      <span aria-label="no" className="text-fd-muted-foreground/50">
        —
      </span>
    );
  }
  return (
    <span
      className={`text-xs ${emphasis ? "text-fd-foreground font-medium" : "text-fd-muted-foreground"}`}
    >
      {value}
    </span>
  );
}

function ComparisonSection() {
  return (
    <section className="border-fd-border border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            How Nova compares
          </h2>
          <p className="text-fd-muted-foreground max-w-2xl text-pretty">
            There are plenty of great caching libraries for JavaScript. Most are
            designed around a particular runtime or caching strategy. Nova takes
            a different approach: one cache API that works across JavaScript
            runtimes and lets storage remain an implementation detail.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-sm">
            <thead>
              <tr className="border-fd-border border-b">
                <th className="px-3 py-3 text-left font-medium" />
                <th className="bg-fd-info/5 border-fd-info/20 rounded-t-lg border-x border-t px-4 py-3 text-center">
                  <span className="text-fd-info font-semibold">nova-cache</span>
                </th>
                {compareLibs.map((lib) => (
                  <th
                    key={lib}
                    className="text-fd-muted-foreground px-4 py-3 text-center font-mono text-xs font-medium"
                  >
                    {lib}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row, ri) => {
                const last = ri === compareRows.length - 1;
                return (
                  <tr key={row.label} className="border-fd-border border-b">
                    <th
                      scope="row"
                      className="px-3 py-3 text-left font-medium whitespace-nowrap"
                    >
                      {row.label}
                    </th>
                    <td
                      className={`bg-fd-info/5 border-fd-info/20 border-x px-4 py-3 text-center ${last ? "rounded-b-lg border-b" : ""}`}
                    >
                      <CompareCell value={row.nova} emphasis />
                    </td>
                    {row.others.map((cell, i) => (
                      <td
                        key={compareLibs[i]}
                        className="px-4 py-3 text-center"
                      >
                        <CompareCell value={cell} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-fd-muted-foreground mt-8 text-center text-sm">
          Established alternatives, different tradeoffs.
        </p>
        <p className="text-fd-muted-foreground mx-auto mt-2 max-w-2xl text-center text-pretty">
          Nova isn&rsquo;t trying to replace every caching library. It&rsquo;s
          for when you want the same cache abstraction across Node, browsers,
          and other JavaScript runtimes.
        </p>

        <p className="text-fd-muted-foreground/70 mx-auto mt-6 max-w-3xl text-center text-xs text-pretty">
          * Runtime support reflects each library&rsquo;s primary design. **
          Best effort via storage adapters. Comparisons describe design focus,
          not quality — each library is a solid choice for what it targets.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Final Section — Install CTA
//
// Deliberately understated. The page already made the argument; this just makes
// the next step obvious. One install command, two actions, one closing line.
// ---------------------------------------------------------------------------

function InstallCta() {
  return (
    <section className="border-fd-border relative isolate overflow-hidden border-t">
      {/* Decorative ASCII topography. Purely atmospheric — a vertical alpha
          mask (not a colour overlay) feathers it into the page at both edges,
          so the copy stays legible and no grey band appears in light mode.
          It's dialled back further in light mode, where the artwork's
          near-black ink would otherwise fight the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_30%,black_70%,transparent_100%)]"
      >
        {/* <Image
          src={asciiWaves}
          alt=""
          width={ASCII_WAVES.width}
          height={ASCII_WAVES.height}
          sizes="100vw"
          loading="lazy"
          decoding="async"
          preload={false}
          className="size-full object-cover opacity-20 dark:opacity-60"
        /> */}

        <AsciiTopography />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-20 text-center sm:py-24">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Start caching.
        </h2>
        <p className="text-fd-muted-foreground max-w-lg text-lg text-pretty">
          Install Nova and add a cache to your application in a few lines.
        </p>

        <div className="mx-auto w-full max-w-lg text-left">
          <InstallTabs />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://www.npmjs.com/package/nova-cache"
            className={buttonVariants({
              variant: "primary",
              className: "px-5 py-2.5",
            })}
          >
            Install Nova
          </a>
          <a
            href="https://github.com/joeyjiron/nova"
            className={buttonVariants({
              variant: "outline",
              className: "px-5 py-2.5",
            })}
          >
            View on GitHub
          </a>
        </div>

        <p className="text-fd-muted-foreground mt-2 text-sm text-pretty">
          Open source. Tiny by design. Works anywhere JavaScript runs.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function SiteFooter() {
  return (
    <footer className="text-fd-muted-foreground border-t px-6 py-6 text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()}{" "}
          <a
            className="underline underline-offset-4"
            href="https://joeyjiron.com"
          >
            Joey Jiron
          </a>
          .
        </p>
        <nav className="flex items-center gap-4">
          <a
            className="hover:text-fd-foreground transition-colors"
            href="https://github.com/joeyjiron06"
            aria-label="GitHub"
          >
            <svg
              role="img"
              viewBox="0 0 24 24"
              aria-hidden
              className="size-5 fill-current"
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
          <a
            className="hover:text-fd-foreground transition-colors"
            href="https://x.com/joeyjiron06"
            aria-label="X"
          >
            <svg
              role="img"
              viewBox="0 0 24 24"
              aria-hidden
              className="size-5 fill-current"
            >
              <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
            </svg>
          </a>
        </nav>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <HomeLayout>
      <Hero />
      <RuntimeWall />
      <FeatureGrid />
      <ProblemSection />
      <SolutionSection />
      <WrapSection />
      <TtlSection />
      <ComparisonSection />
      <InstallCta />
      <SiteFooter />
    </HomeLayout>
  );
}
