import { defineConfig, mergeConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // This mapping is what fixes the "Failed to resolve import" errors
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    
    // Performance and stability settings
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },

    // Coverage reporting
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/components/**/*.jsx', 'src/pages/**/*.jsx', 'src/hooks/**/*.js'],
      exclude: ['src/main.jsx', 'src/vite-env.d.ts', '**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    },
  },
});
