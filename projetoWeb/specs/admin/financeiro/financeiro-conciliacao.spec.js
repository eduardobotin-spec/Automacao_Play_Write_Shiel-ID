/**
 * SPEC — Conciliação Bancária (Módulo 5)
 *
 * Gherkin: CENARIOS_GHERKIN_QA_FINANCEIRO.md — Módulo 5
 * STATUS: todos NOT IMPLEMENTED — depende de Gateway (Módulo 4) estar entregue.
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';

test.describe('Conciliação Bancária [NI]', () => {

  test.skip('NI — depósito identificado baixa a fatura automaticamente', async () => {});

  test.skip('NI — depósito parcial (gateway + banco) não duplica pagamento', async () => {});

  test.skip('NI — depósito sem identificação marca como "não_conciliado" e cria alerta', async () => {});

  test.skip('NI — discrepância de valor detectada e marcada para revisão', async () => {});
});
