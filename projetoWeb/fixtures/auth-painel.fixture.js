/**
 * Fixture de autenticação — Painel (painel.shielid-staging.com)
 * Usuário: zugote88@gmail.com / 123456 (Administrador)
 */

import { test as base } from '@playwright/test';
import { login } from '../helpers/auth.js';

export const test = base.extend({
  page: async ({ page }, use) => {
    await login(page, {
      baseURL: 'https://painel.shielid-staging.com',
      email: process.env.PAINEL_EMAIL || 'zugote88@gmail.com',
      password: process.env.PAINEL_PASSWORD || '123456',
    });
    await use(page);
    await page.context().clearCookies();
  },
});

export { expect } from '@playwright/test';
