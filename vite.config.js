import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    
    // Use forks pool for better isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    
    // Critical for CI/CD: force the runner to exit after tests complete
    forceExit: true,
    
    // Surgical coverage configuration to prevent reporter timeouts
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
