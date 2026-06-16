/**
 * SPEC — Alertas de Inadimplência (Módulo 6)
 *
 * Gherkin: CENARIOS_GHERKIN_QA_FINANCEIRO.md — Módulo 6
 * STATUS: todos NOT IMPLEMENTED — depende de Gateway + Conciliação.
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';

test.describe('Alertas de Inadimplência [NI]', () => {

  test.skip('NI — fatura vencida T+1 dispara e-mail de cobrança', async () => {});

  test.skip('NI — fatura vencida T+7 dispara segundo e-mail', async () => {});

  test.skip('NI — cliente suspenso automaticamente em T+30', async () => {});

  test.skip('NI — acesso restaurado após pagamento de fatura atrasada', async () => {});

  test.skip('NI — filtro inadimplente mostra clientes com atraso > 7 dias', async () => {});
});
