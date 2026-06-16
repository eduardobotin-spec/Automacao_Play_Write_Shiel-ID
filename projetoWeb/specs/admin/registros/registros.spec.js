/**
 * SPEC — Admin / Registros
 * URL: /registros
 *
 * STATUS: Pendente de mapeamento DOM.
 * Todos os cenários em test.skip até que a tela seja mapeada.
 * Para ativar: mapear DOM, criar Page Object em pages/admin/, remover test.skip.
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';

test.describe('Admin — Registros', () => {

  test.skip('deve carregar a página /registros', async ({ authenticatedPage: page }) => {
    await page.goto('/registros');
    await expect(page).toHaveURL('**/registros**');
  });

  test.skip('deve exibir conteúdo principal da tela', async ({ authenticatedPage: page }) => {
    await page.goto('/registros');
    // TODO: mapear seletores após DOM inspection
  });

});
