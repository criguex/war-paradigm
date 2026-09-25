import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/evidence/**',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['./tests/mutant-reporter.ts'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4310',
    viewport: { width: 1080, height: 760 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node app/server.js',
    url: 'http://localhost:4310',
    reuseExistingServer: false,
    stdout: 'ignore',
  },
});
