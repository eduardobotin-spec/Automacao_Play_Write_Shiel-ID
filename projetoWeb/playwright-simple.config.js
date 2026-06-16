import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'admin',
      testMatch: '**/specs/admin/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://admin.shielid-staging.com',
      },
    },
    {
      name: 'painel',
      testMatch: '**/specs/painel/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://painel.shielid-staging.com',
      },
    },
    {
      name: 'fluxos',
      testMatch: '**/specs/fluxos/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
