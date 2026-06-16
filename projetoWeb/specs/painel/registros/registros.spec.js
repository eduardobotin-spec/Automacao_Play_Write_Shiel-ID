/**
 * SPEC — Painel / Registros
 * URL: /registros
 *
 * STATUS: Pendente de mapeamento DOM.
 * Todos os cenários em test.skip até que a tela seja mapeada.
 * Para ativar: mapear DOM, criar Page Object em pages/painel/, remover test.skip.
 */

import { test, expect } from '../../../fixtures/auth-painel.fixture.js';

test.describe('Painel — Registros', () => {

  test.skip('deve carregar a página /registros', async ({ page }) => {
    await page.goto('/registros');
    await expect(page).toHaveURL('**/registros**');
  });

  test.skip('deve exibir conteúdo principal da tela', async ({ page }) => {
    await page.goto('/registros');
    // TODO: mapear seletores após DOM inspection
  });

});
