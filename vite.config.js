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

    // Use Vitest defaults for process management.
    // Removing custom pool settings helps determine whether
    // worker lifecycle management is contributing to the hang.

    testTimeout: 60000,

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
