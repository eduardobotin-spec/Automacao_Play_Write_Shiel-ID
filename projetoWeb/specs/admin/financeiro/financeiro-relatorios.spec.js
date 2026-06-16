/**
 * SPEC — Relatórios e Exportação (Módulo 8)
 *
 * Gherkin: CENARIOS_GHERKIN_QA_FINANCEIRO.md — Módulo 8
 * STATUS: todos NOT IMPLEMENTED — depende de todos os módulos anteriores.
 *
 * Cenário de performance (10k clientes < 60s) é candidato a JMeter, não E2E UI.
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';

test.describe('Relatórios e Exportação [NI]', () => {

  test.skip('NI — relatório de faturamento mensal gera PDF/Excel com totais corretos', async () => {});

  test.skip('NI — relatório de recebimentos exibe data, cliente, valor, forma de pagamento', async () => {});

  test.skip('NI — relatório de inadimplência lista clientes vencidos > 7 dias', async () => {});

  test.skip('NI — relatório de comissões bate com cálculos do sistema', async () => {});

  test.skip('NI — exportação para ERP em JSON/XML sem erro de encoding', async () => {});

  test.skip('NI — agendamento de relatório envia e-mail no dia 1º do mês', async () => {});

  test.skip('NI — PERF: relatório de 10k clientes/12 meses < 60s [JMeter]', async () => {
    // Candidato a JMeter, não Playwright
  });
});
