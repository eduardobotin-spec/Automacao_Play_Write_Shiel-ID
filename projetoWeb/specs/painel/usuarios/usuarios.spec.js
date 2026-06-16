/**
 * SPEC — Painel / Gestão de Usuários
 * URL: /usuarios
 *
 * STATUS: Pendente de mapeamento DOM.
 * Todos os cenários em test.skip até que a tela seja mapeada.
 * Para ativar: mapear DOM, criar Page Object em pages/painel/, remover test.skip.
 */

import { test, expect } from '../../../fixtures/auth-painel.fixture.js';

test.describe('Painel — Gestão de Usuários', () => {

  test.skip('deve carregar a página /usuarios', async ({ page }) => {
    await page.goto('/usuarios');
    await expect(page).toHaveURL('**/usuarios**');
  });

  test.skip('deve exibir conteúdo principal da tela', async ({ page }) => {
    await page.goto('/usuarios');
    // TODO: mapear seletores após DOM inspection
  });

});
