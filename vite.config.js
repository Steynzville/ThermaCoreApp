import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.js"],
    watch: false,
    passWithNoTests: true,
    forceExit: true,
    
    // Process configuration strategy optimized for strict CI memory profiles
    pool: "forks",
    poolOptions: {
      forks: {
        // 1. Disable single long-lived process confinement
        singleFork: false,
        // 2. Force hard isolation limits per file batch
        isolate: true,
      },
    },
    
    // Confinement settings: Run sequentially, but terminate and recreate the process continuously
    maxWorkers: 1,
    minWorkers: 1,
    
    // Explicitly optimize V8 flags via Vitest's CLI layer to drop completed code caches
    maxHeap: 0.45, // Triggers aggressive V8 garbage collection if heap crosses 45% of available RAM
    
    testTimeout: 15000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{js,jsx}"],
      exclude: [
        "node_modules/",
        "src/setupTests.js",
        "src/mockData.js",
        "**/*.test.{js,jsx}",
        "**/*.spec.{js,jsx}",
      ],
    },
  },
});
