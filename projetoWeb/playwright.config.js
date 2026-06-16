import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false, // false: evita conflitos em staging compartilhado
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    launchOptions: {
      args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
    },
  },
  projects: [
    {
      // Admin: specs/admin/**
      name: 'admin',
      testMatch: '**/specs/admin/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.ADMIN_BASE_URL || 'https://admin.shielid-staging.com',
      },
    },
    {
      // Painel: specs/painel/**
      name: 'painel',
      testMatch: '**/specs/painel/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PAINEL_BASE_URL || 'https://painel.shielid-staging.com',
      },
    },
    {
      // Fluxos: specs/fluxos/** — testes soltos, fluxos E2E que cruzam telas/ambientes
      // Não define baseURL fixo — specs usam URLs absolutas
      name: 'fluxos',
      testMatch: '**/specs/fluxos/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
