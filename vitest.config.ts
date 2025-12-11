import { defineConfig } from "vitest/config";

export default defineConfig({
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
