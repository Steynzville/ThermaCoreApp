import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  test: {
    globals: true,
    environment: "jsdom",

    setupFiles: "./src/setupTests.js",

    testTimeout: 60000,

    // IMPORTANT: keep minimal — avoid destabilizing JSDOM
    isolate: true,
    clearMocks: true,
    restoreMocks: true,

    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
        maxForks: 1,
      },
    },

    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
    },
  },
});
