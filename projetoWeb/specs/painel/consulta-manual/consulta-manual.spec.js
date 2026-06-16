/**
 * SPEC — Painel / Consulta Manual
 * URL: /consultas
 *
 * STATUS: Pendente de mapeamento DOM.
 * Todos os cenários em test.skip até que a tela seja mapeada.
 * Para ativar: mapear DOM, criar Page Object em pages/painel/, remover test.skip.
 */

import { test, expect } from '../../../fixtures/auth-painel.fixture.js';

test.describe('Painel — Consulta Manual', () => {

  test.skip('deve carregar a página /consultas', async ({ page }) => {
    await page.goto('/consultas');
    await expect(page).toHaveURL('**/consultas**');
  });

  test.skip('deve exibir conteúdo principal da tela', async ({ page }) => {
    await page.goto('/consultas');
    // TODO: mapear seletores após DOM inspection
  });

});
