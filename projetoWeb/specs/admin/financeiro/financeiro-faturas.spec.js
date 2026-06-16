/**
 * SPEC — Financeiro / Faturas (/financeiro/faturas)
 *
 * Gherkin de referência: CENARIOS_GHERKIN_QA_FINANCEIRO.md
 *   Módulo 2 (Gateway) — cenários de fatura
 *   Módulo 3 (Dashboard Financeiro)
 *   Módulo 6 (Inadimplência)
 *   Módulo 8 (Relatórios)
 *
 * ESTRATÉGIA:
 *   - Cenários ATIVOS: smoke da tela atual (carregamento, estrutura, estado vazio)
 *   - Cenários [NI]: tudo que depende dos módulos financeiros ainda não entregues
 *     Ativar conforme cada módulo entrar em staging.
 *
 * ESTADO ATUAL DA TELA (2026-06-16):
 *   - Rota: /financeiro/faturas
 *   - 4 cards: Total Faturado, Recebido, Pendente, Vencido (todos R$ 0,00)
 *   - Tabela vazia — sem faturas cadastradas
 *   - 3 filtros: período, representante, status
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';
import { FaturasPage } from '../../../pages/admin/FaturasPage.js';

test.describe('Financeiro — Faturas', () => {
  let faturasPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    faturasPage = new FaturasPage(authenticatedPage);
    await faturasPage.goto();
  });

  // -----------------------------------------------------------------------
  // SMOKE — ATIVOS (estrutura atual da tela)
  // -----------------------------------------------------------------------

  test('deve carregar a página de faturas sem erro', async ({ authenticatedPage }) => {
    await expect(authenticatedPage).toHaveURL(/\/financeiro\/faturas/);
    await expect(authenticatedPage.locator('h1')).toContainText('Financeiro');
  });

  test('deve exibir os 4 cards de resumo financeiro', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('span', { hasText: 'Total Faturado' })).toBeVisible();
    await expect(authenticatedPage.locator('span', { hasText: 'Recebido' })).toBeVisible();
    await expect(authenticatedPage.locator('span', { hasText: 'Pendente' })).toBeVisible();
    await expect(authenticatedPage.locator('span', { hasText: 'Vencido' })).toBeVisible();
  });

  test('deve exibir a tabela de faturas com cabeçalhos corretos', async ({ authenticatedPage }) => {
    await expect(faturasPage.faturasTable).toBeVisible();
    const headers = faturasPage.page.locator('table th');
    await expect(headers.filter({ hasText: 'ID' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Cliente' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Valor' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Vencimento' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Status' })).toBeVisible();
  });

  test('deve exibir estado vazio quando não há faturas', async ({ authenticatedPage }) => {
    await expect(faturasPage.emptyStateMessage).toBeVisible();
  });

  test('deve exibir os 3 filtros disponíveis', async ({ authenticatedPage }) => {
    await expect(faturasPage.filtroPeriodo).toBeVisible();
    await expect(faturasPage.filtroRepresentante).toBeVisible();
    await expect(faturasPage.filtroStatus).toBeVisible();
  });

  test('deve ser acessível pelo menu lateral Financeiro > Faturas', async ({ authenticatedPage }) => {
    // Navega pelo menu em vez da URL direta
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
    await faturasPage.financeiroMenuButton.click();
    await faturasPage.faturasMenuLink.click();
    await expect(authenticatedPage).toHaveURL(/\/financeiro\/faturas/);
  });

  // -----------------------------------------------------------------------
  // NI — Gateway de Pagamento (Módulo 2)
  // Ativar quando módulo de gateway entrar em staging
  // -----------------------------------------------------------------------

  test.skip('NI — fatura gerada aparece na lista com status "Pendente"', async () => {
    // Critério: fatura gerada → link de pagamento criado → aparece na tabela
  });

  test.skip('NI — card "Pendente" reflete valor total das faturas pendentes', async () => {
    // Critério: soma dos valores de faturas com status Pendente = card Pendente
  });

  test.skip('NI — card "Recebido" atualiza após pagamento confirmado via webhook', async () => {
    // Critério: webhook de pagamento → card Recebido incrementa
  });

  test.skip('NI — card "Vencido" reflete faturas com vencimento ultrapassado', async () => {});

  test.skip('NI — filtro por status "Pendente" mostra apenas faturas pendentes', async () => {
    // await faturasPage.filterByStatus('Pendente');
    // linhas da tabela devem ter badge/texto "Pendente"
  });

  test.skip('NI — filtro por status "Vencido" mostra apenas faturas vencidas', async () => {});

  test.skip('NI — filtro por representante mostra apenas faturas do representante selecionado', async () => {});

  test.skip('NI — filtro por período restringe faturas ao intervalo selecionado', async () => {});

  // -----------------------------------------------------------------------
  // NI — Dashboard Financeiro (Módulo 3)
  // -----------------------------------------------------------------------

  test.skip('NI — dados dos cards atualizados em tempo real (< 5s)', async () => {
    // Critério Módulo 3: dados em tempo real < 5s
  });

  test.skip('NI — exportar faturas para Excel com dados corretos', async () => {
    // Critério Módulo 3: exportar → arquivo com colunas corretas
  });

  // -----------------------------------------------------------------------
  // NI — Alertas de Inadimplência (Módulo 6)
  // -----------------------------------------------------------------------

  test.skip('NI — fatura vencida há mais de 30 dias suspende acesso do cliente', async () => {
    // Validação via UI: status do cliente muda para "Suspenso"
  });

  test.skip('NI — filtro status "Inadimplente" mostra clientes com atraso > 7 dias', async () => {});

  // -----------------------------------------------------------------------
  // NI — Relatórios (Módulo 8)
  // -----------------------------------------------------------------------

  test.skip('NI — gerar relatório de faturamento mensal em PDF/Excel', async () => {});

  test.skip('NI — relatório de recebimentos exibe data, cliente, valor, forma de pagamento', async () => {});

  test.skip('NI — relatório de inadimplência lista clientes vencidos > 7 dias', async () => {});
});
