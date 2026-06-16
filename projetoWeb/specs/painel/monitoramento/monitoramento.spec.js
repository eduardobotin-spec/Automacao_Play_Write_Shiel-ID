/**
 * SPEC — Painel / Monitoramento
 * URL: /monitoramento
 *
 * STATUS: Pendente de mapeamento DOM.
 * Todos os cenários em test.skip até que a tela seja mapeada.
 * Para ativar: mapear DOM, criar Page Object em pages/painel/, remover test.skip.
 */

import { test, expect } from '../../../fixtures/auth-painel.fixture.js';

test.describe('Painel — Monitoramento', () => {

  test.skip('deve carregar a página /monitoramento', async ({ page }) => {
    await page.goto('/monitoramento');
    await expect(page).toHaveURL('**/monitoramento**');
  });

  test.skip('deve exibir conteúdo principal da tela', async ({ page }) => {
    await page.goto('/monitoramento');
    // TODO: mapear seletores após DOM inspection
  });

});
