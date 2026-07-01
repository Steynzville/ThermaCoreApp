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
    
    // Switch pool from process forks to lightweight, isolated V8 threads
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false, // Runs files in isolated parallel context buckets
        isolate: true,      // Fully reloads the global environment context per file
      },
    },
    
    // Confinement limits to prevent overwhelming the dual-core GitHub runner
    maxWorkers: 2, 
    minWorkers: 1,
    
    // Tight timeouts to force any hanging UI layout primitives to crash and report their names
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 3000,
    
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
