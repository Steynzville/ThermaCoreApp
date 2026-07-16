import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react()], // ✅ Remove tailwindcss from test environment

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
    environmentOptions: {
      jsdom: {
        resources: "usable",
      },
    },

    setupFiles: ["./src/setupTests.js"],

    testTimeout: 60000,

    // ✅ IMPORTANT: Disable isolation to prevent act() issues
    isolate: false,

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

    // ✅ Suppress act() warnings
    onConsoleLog(log, type) {
      // Filter out act() warnings and other noise
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
        'Warning: `value` prop on `input` should not be null',
      ];

      if (type === 'stderr' && suppressedMessages.some(msg => log.includes(msg))) {
        return;
      }

      // Allow other logs through
      console[type === 'stderr' ? 'error' : 'log'](log);
    },

    // ✅ Retry failed tests
    retry: 1,
  },
});
