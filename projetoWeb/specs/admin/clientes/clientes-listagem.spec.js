/**
 * SPEC — Listagem de Clientes
 *
 * Gherkin de referência: CENARIOS_GHERKIN_QA_FINANCEIRO.md — Módulo 3 (Dashboard)
 * e comportamentos base da tela /clientes
 *
 * Critérios cobertos:
 *   - Página carrega com tabela e dados
 *   - Busca por nome/documento
 *   - Filtro por tipo de conta
 *   - Paginação visível
 *   - Botão "Novo cliente" visível e navegável
 *
 * Cenários NOT IMPLEMENTED (dependem de feature ainda não entregue):
 *   - Filtro por status financeiro (ativo/cancelado/inadimplente) — Módulo 3 do financeiro
 *   - Exportar para Excel — Módulo 3
 *   - Dados em tempo real (< 5s) — Módulo 3
 *   - Responsividade mobile 375px — Módulo 3
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';
import { ClientsPage } from '../../../pages/admin/ClientsPage.js';

test.describe('Listagem de Clientes', () => {
  let clientsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    clientsPage = new ClientsPage(authenticatedPage);
    await clientsPage.goto();
  });

  // -----------------------------------------------------------------------
  // CARREGAMENTO BÁSICO
  // -----------------------------------------------------------------------

  test('deve exibir a tabela de clientes ao acessar /clientes', async ({ authenticatedPage }) => {
    await expect(clientsPage.clientsTable).toBeVisible();
  });

  test('deve exibir pelo menos uma linha de cliente', async ({ authenticatedPage }) => {
    const count = await clientsPage.getClientCount();
    expect(count).toBeGreaterThan(0);
  });

  test('deve exibir o texto de paginação', async ({ authenticatedPage }) => {
    const text = await clientsPage.getPaginationText();
    expect(text).toMatch(/Mostrando \d+ a \d+ de \d+ resultado/);
  });

  test('deve exibir o link "Novo cliente"', async ({ authenticatedPage }) => {
    await expect(clientsPage.newClientLink).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // BUSCA
  // -----------------------------------------------------------------------

  test('deve filtrar clientes ao buscar por nome existente', async ({ authenticatedPage }) => {
    await clientsPage.search('Phelipe');
    const count = await clientsPage.getClientCount();
    expect(count).toBeGreaterThan(0);
    // Linha encontrada deve conter o termo buscado
    const row = clientsPage.page.locator('table tbody tr').first();
    await expect(row).toContainText('Phelipe');
  });

  test('deve exibir zero resultados ao buscar por nome inexistente', async ({ authenticatedPage }) => {
    await clientsPage.search('ClienteQueNaoExisteXYZ999');
    const count = await clientsPage.getClientCount();
    expect(count).toBe(0);
  });

  test('deve buscar por documento (CNPJ)', async ({ authenticatedPage }) => {
    await clientsPage.search('58.491.946');
    const count = await clientsPage.getClientCount();
    expect(count).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // FILTRO DE TIPO (existente na tela atual)
  // -----------------------------------------------------------------------

  test('deve exibir o combobox de filtro de tipo de conta', async ({ authenticatedPage }) => {
    await expect(clientsPage.typeFilterCombobox).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // NAVEGAÇÃO
  // -----------------------------------------------------------------------

  test('deve navegar para /clientes/criar ao clicar em "Novo cliente"', async ({ authenticatedPage }) => {
    await clientsPage.clickNewClient();
    await expect(authenticatedPage).toHaveURL(/\/clientes\/criar/);
  });

  // -----------------------------------------------------------------------
  // NOT IMPLEMENTED — aguardando entrega do módulo financeiro
  // -----------------------------------------------------------------------

  test.skip('NI — filtro por status financeiro (ativo/cancelado/inadimplente)', async () => {
    // Módulo 3 do financeiro — não implementado ainda
  });

  test.skip('NI — exportar para Excel', async () => {
    // Módulo 3 do financeiro — não implementado ainda
  });

  test.skip('NI — dados atualizados em tempo real (< 5s)', async () => {
    // Módulo 3 do financeiro — não implementado ainda
  });

  test.skip('NI — responsividade mobile 375px', async () => {
    // Módulo 3 do financeiro — não implementado ainda
  });
});
