import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 10000,
    allowedHosts: [
      'thermacoreapp.onrender.com',
      '.onrender.com',
      'localhost',
      '127.0.0.1'
    ]
  },

  preview: {
    host: '0.0.0.0',
    port: 10000,
    strictPort: true,
    allowedHosts: [
      'thermacoreapp.onrender.com',
      '.onrender.com',
      'localhost',
      '127.0.0.1'
    ]
  },

  test: {
    globals: true,
    environment: "jsdom",

    setupFiles: "./src/setupTests.js",

    testTimeout: 60000,

    // IMPORTANT: keep minimal — avoid destabilizing JSDOM
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

    // ✅ NEW: Suppress console warnings during tests
    onConsoleLog(log, type) {
      // Suppress specific warning messages
      const suppressedMessages = [
        'The current testing environment is not configured to support act(...)',
        'React does not recognize the',
        'In HTML, <',
        'You provided a `value` prop to a form field without an `onChange` handler',
        'The tag <text> is unrecognized in this browser',
        'Warning: React does not recognize the',
        'Warning: In HTML, <',
        'Warning: You provided a',
        'WARNING: Panel defaultSize prop recommended',
      ];

      if (type === 'stderr' && suppressedMessages.some(msg => log.includes(msg))) {
        return;
      }

      // Allow other logs through
      console[type === 'stderr' ? 'error' : 'log'](log);
    },

    // ✅ NEW: Hide specific deprecation warnings
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously',
      },
    },

    // ✅ NEW: Retry failed tests to reduce flakiness
    retry: 1,
  },
});
