import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Fixes: "Failed to resolve import @/lib/utils"
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    
    // Maintain isolation while preventing worker deadlocks
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    
    // CRITICAL: Forces the runner to kill all processes immediately 
    // after the test suite finishes, preventing CI hangs.
    forceExit: true,
    
    // Narrow coverage scope to prevent the v8 reporter from 
    // timing out on large dependency trees.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/components/**/*.jsx', 
        'src/pages/**/*.jsx', 
        'src/hooks/**/*.js'
      ],
      exclude: [
        'src/main.jsx',
        'src/vite-env.d.ts',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}'
      ],
    },
  },
});
