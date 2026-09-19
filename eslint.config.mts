import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Global ignores. This has to be an object with `ignores` and nothing else:
  // put `ignores` alongside `files` and it only excludes files from that one
  // config object, which lets build output reach the configs below it.
  {
    ignores: ["dist/**", "coverage/**", "site/**"],
  },
  {
    files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
]);
