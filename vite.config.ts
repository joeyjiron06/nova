import { defineConfig } from "vitest/config";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [dts()],

  build: {
    rollupOptions: {
      input: {
        index: "./src/index.ts",
        "stores/fileSystemStore": "./src/stores/fileSystemStore.ts",
        "stores/indexedDBStore": "./src/stores/indexedDBStore.ts",
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
