/**
 * SPEC — Admin / Monitoramento
 * URL: /monitoramento
 *
 * STATUS: Pendente de mapeamento DOM.
 * Todos os cenários em test.skip até que a tela seja mapeada.
 * Para ativar: mapear DOM, criar Page Object em pages/admin/, remover test.skip.
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';

test.describe('Admin — Monitoramento', () => {

  test.skip('deve carregar a página /monitoramento', async ({ authenticatedPage: page }) => {
    await page.goto('/monitoramento');
    await expect(page).toHaveURL('**/monitoramento**');
  });

  test.skip('deve exibir conteúdo principal da tela', async ({ authenticatedPage: page }) => {
    await page.goto('/monitoramento');
    // TODO: mapear seletores após DOM inspection
  });

});
