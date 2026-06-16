/**
 * SPEC — Painel / Dashboard
 * URL: /dashboard
 *
 * STATUS: Pendente de mapeamento DOM.
 * Todos os cenários em test.skip até que a tela seja mapeada.
 * Para ativar: mapear DOM, criar Page Object em pages/painel/, remover test.skip.
 */

import { test, expect } from '../../../fixtures/auth-painel.fixture.js';

test.describe('Painel — Dashboard', () => {

  test.skip('deve carregar a página /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('**/dashboard**');
  });

  test.skip('deve exibir conteúdo principal da tela', async ({ page }) => {
    await page.goto('/dashboard');
    // TODO: mapear seletores após DOM inspection
  });

});
