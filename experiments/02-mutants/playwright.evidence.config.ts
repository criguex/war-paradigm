import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Browser reproduction of the surviving mutant, slowed down and recorded on video.
// Output: test-results/**/video.webm
export default defineConfig(base, {
  testIgnore: [],
  testMatch: ['evidence/**/*.spec.ts'],
  reporter: [['list']],
  use: {
    ...base.use,
    trace: 'off',
    video: { mode: 'on', size: { width: 1080, height: 760 } },
    launchOptions: { slowMo: 300 },
  },
});
