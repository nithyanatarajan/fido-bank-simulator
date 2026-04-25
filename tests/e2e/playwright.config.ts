import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:5173',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: process.env.TEST_URL
    ? []
    : [
        {
          command: 'cd ../../backend && uv run uvicorn app.main:app --port 9090',
          port: 9090,
          reuseExistingServer: !process.env.CI,
        },
        {
          command: 'cd ../../frontend && pnpm dev',
          port: 5173,
          reuseExistingServer: !process.env.CI,
        },
      ],
});
