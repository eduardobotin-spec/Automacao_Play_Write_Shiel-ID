/**
 * SPEC — Admin / Dashboard
 * URL: /dashboard
 *
 * STATUS: Pendente de mapeamento DOM.
 * Todos os cenários em test.skip até que a tela seja mapeada.
 * Para ativar: mapear DOM, criar Page Object em pages/admin/, remover test.skip.
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';

test.describe('Admin — Dashboard', () => {

  test.skip('deve carregar a página /dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('**/dashboard**');
  });

  test.skip('deve exibir conteúdo principal da tela', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    // TODO: mapear seletores após DOM inspection
  });

});
