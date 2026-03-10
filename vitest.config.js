import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  // Disable Vite's "public" static-asset restriction so tests can import
  // files that live under public/js/ as normal ES modules.
  publicDir: false,
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "/js/": resolve(import.meta.dirname, "public/js/") + "/",
    },
  },
});
