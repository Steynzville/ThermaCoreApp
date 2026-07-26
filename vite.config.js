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
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
      "thermacoreapp.onrender.com",
    ],
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
      "thermacoreapp.onrender.com",
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    testTimeout: 10000, // <-- ONLY THIS VALUE CHANGED (was 60000)
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
