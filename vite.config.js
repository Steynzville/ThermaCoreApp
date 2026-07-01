import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(() => {
  const plugins = [react(), tailwindcss()];

  // Enable bundle analysis with: ANALYZE=1 vite build
  if (process.env.ANALYZE) {
    plugins.push(
      visualizer({
        filename: "dist/stats.html",
        template: "treemap",
        gzipSize: true,
        brotliSize: true,
        sourcemap: false,
        open: false,
      }),
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Remove the credential defines since we're using file aliases now
    },
    build: {
      target: "es2020",
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react-router-dom")) {
                return "react-router-dom-vendor";
              }
              if (id.includes("react") && !id.includes("react-dom")) {
                return "react-vendor";
              }
              if (id.includes("react-dom")) {
                return "react-dom-vendor";
              }
              if (id.includes("recharts")) {
                return "recharts-vendor";
              }
              if (id.includes("lodash")) {
                return "lodash-vendor";
              }
              return "vendor"; // All other dependencies go into a common vendor chunk
            }
          },
        },
      },
      // cssCodeSplit is true by default; keep it for leaner route CSS
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: "all",
      port: 5000,
      cors: true,
    },
    optimizeDeps: {
      include: ["path-to-regexp", "react-router-dom", "react-router"],
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/setupTests.js"],
      watch: false,
      passWithNoTests: true,
      testTimeout: 15000,
      hookTimeout: 10000,
      teardownTimeout: 5000,
      maxWorkers: 2,
      minWorkers: 1,
      pool: "forks",
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
      // Add these to prevent circular reference issues and hanging
      isolate: true,
      sequence: {
        concurrent: false,
        shuffle: false,
      },
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary"],
        reportsDirectory: "./coverage",
        include: ["src/**/*.{js,jsx}"],
        exclude: [
          "node_modules/",
          "src/setupTests.js",
          "**/*.test.{js,jsx}",
          "**/*.spec.{js,jsx}",
        ],
      },
    },
  };
});
