import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import press from "fumapress/vite";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [
    press(),
    fumadocsMdx(),
    tailwindcss(),
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
