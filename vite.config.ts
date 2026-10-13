import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: [
        '**/scratch/**',
        '**/.git/**',
        '**/.kilo/**',
        '**/coverage/**',
        '**/temp/**',
        '**/*.log',
      ],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.kilo/**', '**/.git/**'],
    testTimeout: 20000,
    pool: 'threads',
    maxWorkers: 3,
  },
});
