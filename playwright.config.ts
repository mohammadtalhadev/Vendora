import { defineConfig } from '@playwright/test';

// Vendora live QA harness. Specs are named *.e2e.ts so Vitest never collects them.
// Runs against its own dev server on 5199 so the port the rest of the tooling uses stays free.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  outputDir: './scratch/qa/test-results',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: 'scratch/qa/playwright-report.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5199',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  globalSetup: './tests/e2e/global-setup.ts',
  // A production build, not the dev server: on-demand route compilation was starving
  // every page visit, and a frozen bundle keeps the sweep comparable while the other
  // agent edits the tree underneath it. Rebuild with `npx vite build` before re-running.
  webServer: {
    command: 'npx vite preview --port 5199 --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
