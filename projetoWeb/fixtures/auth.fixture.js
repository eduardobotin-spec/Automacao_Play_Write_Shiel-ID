/**
 * Fixture - Autenticação
 * Setup automático de login antes de cada teste
 */

import { test as base } from '@playwright/test';
import { login } from '../helpers/auth.js';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Setup: faz login antes do teste
    const email = process.env.LOGIN_EMAIL || 'eduardobotinshielid@gmail.com';
    const password = process.env.LOGIN_PASSWORD || '123456';

    await login(page, email, password);

    // Usa a página autenticada no teste
    await use(page);

    // Teardown: limpa cookies após o teste
    await page.context().clearCookies();
  },
});

export { expect } from '@playwright/test';
