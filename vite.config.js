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
    
    // Maintain lightweight threads but impose order constraints to reveal the stall point
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false, 
        isolate: true,      
      },
    },
    
    // Run sequentially for this cycle so the terminal output lists the exact file that freezes
    maxWorkers: 1, 
    minWorkers: 1,
    
    testTimeout: 15000,
    hookTimeout: 15000,
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
