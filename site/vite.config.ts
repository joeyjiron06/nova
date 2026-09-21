import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import press from "fumapress/vite";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import svgr from "vite-plugin-svgr";

// `typescript` must stay out of the server bundle.
//
// `fumadocs-typescript` drives the native TypeScript compiler through
// `typescript/unstable/sync`, which locates its binary by reading the
// `package.json` sitting next to it. Bundle that code and the file is no longer
// there, so the build dies with ENOENT on `dist/server/package.json`.
//
// Only `typescript` is externalized. Externalizing `fumadocs-typescript` as well
// pulls its React `TypeTable` out of the bundle too, and the unbundled copy gets
// a React without the server-component runtime.
//
// A top-level `ssr.external` only reaches the `ssr` environment. `AutoTypeTable`
// is a server component, so it runs in `rsc`, which keeps its own list.
const KEEP_EXTERNAL = ["typescript"];

function keepTypescriptGeneratorExternal(): Plugin {
  return {
    name: "nova:keep-typescript-generator-external",
    enforce: "post",
    configResolved(config) {
      for (const [name, env] of Object.entries(config.environments ?? {})) {
        if (name === "client") continue;

        const external = env.resolve?.external;
        if (!Array.isArray(external)) continue;

        for (const pkg of KEEP_EXTERNAL) {
          if (!external.includes(pkg)) external.push(pkg);
        }
      }
    },
  };
}

export default defineConfig({
  ssr: {
    external: KEEP_EXTERNAL,
  },

  plugins: [
    press({
      basePath: "nova",
    }),
    fumadocsMdx(),
    tailwindcss(),
    keepTypescriptGeneratorExternal(),
    // Only files imported with the `?react` suffix become components; a plain
    // `import x from "./y.svg"` still resolves to a URL string.
    svgr({
      svgrOptions: {
        // Drop the baked-in width/height so callers size the mark with
        // classes. Without this the nav logo renders at its native 720x720.
        dimensions: false,
        // The source art hard-codes `white`, which is invisible against the
        // light theme. Swapping to `currentColor` makes the mark inherit the
        // navbar foreground in both themes.
        replaceAttrValues: { white: "currentColor" },
      },
    }),
  ],
});
