import { defineConfig } from "vitest/config";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [dts()],

  build: {
    rollupOptions: {
      input: {
        index: "./src/index.ts",
        "stores/fsStore": "./src/stores/fsStore.ts",
        "stores/memoryStore": "./src/stores/memoryStore.ts",
      },
    },
    ssr: true,
  },

  test: {
    environment: "node",
    coverage: {
      reporter: ["text", "json", "html"],
      thresholds: {
        100: true,
      },
    },
  },
});
