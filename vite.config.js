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
    
    // Process configuration strategy
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
        // Forces Node to completely cycle the process context to release cached heap memory
        isolate: true, 
      },
    },
    
    // Confinement settings for resource stability inside environments like GitHub Actions
    maxWorkers: 1,
    minWorkers: 1,
    
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
