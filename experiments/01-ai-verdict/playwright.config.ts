import { defineConfig } from '@playwright/test';

// No browser here: the Playwright test runner drives pure TypeScript checks.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
});
