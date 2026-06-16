/**
 * SPEC — Dashboard Financeiro (Módulo 3)
 *
 * Gherkin de referência: CENARIOS_GHERKIN_QA_FINANCEIRO.md — Módulo 3
 *
 * STATUS: todos NOT IMPLEMENTED — feature ainda não entregue.
 *
 * Quando implementar:
 *   1. Criar DashboardFinanceiroPage (page object)
 *   2. Mapear URL, tabela de clientes, filtros, botão exportar
 *   3. Remover test.skip e implementar
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';

test.describe('Dashboard Financeiro [NI]', () => {

  test.skip('NI — listar clientes ativos com consumo do mês', async () => {
    // Critério: tabela com nome cliente, status, consumo mês
    // Dados atualizados em < 5s
  });

  test.skip('NI — filtrar por status financeiro "inadimplente"', async () => {
    // Critério: filtro status=inadimplente → apenas clientes com atraso > 7 dias
  });

  test.skip('NI — exportar para Excel com dados corretos', async () => {
    // Critério: arquivo Excel com colunas: cliente, status, consumo, valor
  });

  test.skip('NI — responsividade mobile (375px)', async () => {
    // Critério: sem overflow, botões clicáveis (> 48px)
    // Usar: authenticatedPage.setViewportSize({ width: 375, height: 812 })
  });
});
