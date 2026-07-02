import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",

    // Keep defaults while isolating the hanging test.
    watch: false,
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 60000,

    // Run test files sequentially for deterministic debugging.
    sequence: {
      concurrent: false,
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
  },
});
