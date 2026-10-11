import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite --config vite.test.config.mjs --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/demos',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  reporter: [['list']],
});
