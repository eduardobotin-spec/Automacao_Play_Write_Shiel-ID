/**
 * SPEC — Admin / Gestão de Usuários
 * URL: /usuarios
 *
 * STATUS: Pendente de mapeamento DOM.
 * Todos os cenários em test.skip até que a tela seja mapeada.
 * Para ativar: mapear DOM, criar Page Object em pages/admin/, remover test.skip.
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';

test.describe('Admin — Gestão de Usuários', () => {

  test.skip('deve carregar a página /usuarios', async ({ authenticatedPage: page }) => {
    await page.goto('/usuarios');
    await expect(page).toHaveURL('**/usuarios**');
  });

  test.skip('deve exibir conteúdo principal da tela', async ({ authenticatedPage: page }) => {
    await page.goto('/usuarios');
    // TODO: mapear seletores após DOM inspection
  });

});
