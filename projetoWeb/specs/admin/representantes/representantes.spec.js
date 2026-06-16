/**
 * SPEC — Admin / Representantes
 * URL: /representantes
 *
 * STATUS: Pendente de mapeamento DOM.
 * Todos os cenários em test.skip até que a tela seja mapeada.
 * Para ativar: mapear DOM, criar Page Object em pages/admin/, remover test.skip.
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';

test.describe('Admin — Representantes', () => {

  test.skip('deve carregar a página /representantes', async ({ authenticatedPage: page }) => {
    await page.goto('/representantes');
    await expect(page).toHaveURL('**/representantes**');
  });

  test.skip('deve exibir conteúdo principal da tela', async ({ authenticatedPage: page }) => {
    await page.goto('/representantes');
    // TODO: mapear seletores após DOM inspection
  });

});
