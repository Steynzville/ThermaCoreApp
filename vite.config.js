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
    
    // Process configuration strategy optimized for swift execution and low overhead
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false, // Drop process context between executions to flush the V8 heap
        isolate: true,      // Keep environment scopes clean per test file
      },
    },
    
    // Confinement limits: Running sequentially eliminates CPU core thrashing in CI
    maxWorkers: 1,
    minWorkers: 1,
    
    // Generous timeouts to prevent heavy component trees from hitting a wall prematurely
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    
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
