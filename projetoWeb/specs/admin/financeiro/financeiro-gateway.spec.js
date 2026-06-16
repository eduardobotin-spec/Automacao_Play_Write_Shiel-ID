/**
 * SPEC — Gateway de Pagamento (Módulo 4 do financeiro)
 *
 * Gherkin: CENARIOS_GHERKIN_QA_FINANCEIRO.md — Módulo 4
 * STATUS: todos NOT IMPLEMENTED — spike técnico de gateway pendente (decisão PO/Eng).
 *
 * NOTA: cenários de webhook são candidatos a testes de API (não E2E UI).
 * Manter aqui como rastreabilidade dos critérios.
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';

test.describe('Gateway de Pagamento [NI]', () => {

  test.skip('NI — fatura gerada gera link de pagamento automaticamente', async () => {});

  test.skip('NI — link enviado por e-mail ao cliente', async () => {});

  test.skip('NI — webhook recebido atualiza status fatura para "pago"', async () => {
    // Candidato a teste de API, não E2E
  });

  test.skip('NI — webhook duplicado é ignorado (sem 2 registros)', async () => {
    // Candidato a teste de API
  });

  test.skip('NI — timeout do gateway retorna erro controlado e enfileira retry', async () => {});
});
