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
    hookTimeout: 30000,
    pool: 'threads',
    // CI runners are small (2 vCPU): fewer workers means less contention for the
    // heaviest suites, which are render-bound and intermittently time out under load.
    maxWorkers: process.env.CI ? 2 : 3,
  },
});
