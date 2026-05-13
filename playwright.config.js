const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests'),
  timeout: 180_000,
  expect: { timeout: 30_000 },
  // Garante agregação de logs num único ficheiro por execução.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
});
