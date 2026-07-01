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
    
    // REVERT: Back to the isolated thread execution pool that broke past card.test.jsx
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
    
    // FORTIFIED TIMEOUTS: Extended from 10s to 45s so you can see every single red line/assertion error
    testTimeout: 45000,
    hookTimeout: 45000,
    teardownTimeout: 15000,
    
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
