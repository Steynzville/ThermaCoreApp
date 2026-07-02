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
    hookTimeout: 60000,

    // IMPORTANT: stabilizes Radix / Floating UI / layout calculations
    environmentOptions: {
      jsdom: {
        resources: "usable",
        pretendToBeVisual: true,
      },
    },

    // IMPORTANT: isolates tests better (prevents shared state leaks)
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,

    // Prevent silent hangs in async UI libraries
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
      include: [
        "src/components/**/*.jsx",
        "src/pages/**/*.jsx",
        "src/hooks/**/*.js",
      ],
      exclude: [
        "src/main.jsx",
        "src/vite-env.d.ts",
        "**/*.test.{js,jsx}",
        "**/*.spec.{js,jsx}",
      ],
    },

    // Helps identify silent async hangs
    logHeapUsage: true,
    sequence: {
      shuffle: false,
    },
  },
});
