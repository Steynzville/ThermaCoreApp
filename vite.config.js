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
    
    // SWITCH: Use forks instead of threads to eliminate JSDOM asynchronous loop hanging
    pool: "forks",
    poolOptions: {
      forks: {
        isolate: true, // Guarantees a pristine global environment context per file
      },
    },
    
    // Maximize standard GitHub Actions runner dual-core hardware
    maxWorkers: 2, 
    minWorkers: 1,
    
    // Extended ceilings so complex structural elements complete diagnostics safely
    testTimeout: 30000,
    hookTimeout: 30000,
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
