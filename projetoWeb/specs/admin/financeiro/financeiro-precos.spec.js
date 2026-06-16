/**
 * SPEC — Flexibilizar Preços (Módulo 4)
 *
 * Gherkin de referência: CENARIOS_GHERKIN_QA_FINANCEIRO.md — Módulo 2 (Flexibilizar Preços)
 *
 * STATUS: todos os testes marcados como NOT IMPLEMENTED.
 * Este arquivo existe para manter o mapeamento dos cenários e facilitar
 * a implementação quando a feature for entregue.
 *
 * Quando implementar:
 *   1. Mapear os seletores da tela de configuração de preços (ClientDetailPage ou nova página)
 *   2. Remover test.skip dos cenários aplicáveis
 *   3. Implementar os steps usando os Page Objects correspondentes
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';

test.describe('Flexibilizar Preços [NI]', () => {

  test.skip('NI — preço padrão aplicado quando cliente não tem preço customizado', async () => {
    // Critério: cliente sem preço custom → fatura usa preço padrão do serviço
  });

  test.skip('NI — preço customizado sobrescreve o padrão', async () => {
    // Critério: cliente com preço custom = R$ 5.000 → fatura mostra R$ 5.000
  });

  test.skip('NI — múltiplos serviços respeitam preços individuais', async () => {
    // Critério: cada serviço com preço próprio, fatura discrimina cada um
  });

  test.skip('NI — rejeitar preço abaixo do mínimo configurado', async () => {
    // Critério: salvar preço abaixo do mínimo → validação rejeita com mensagem
    // OBSERVAÇÃO DOM: campo de preço já exibe "(Mínimo: R$ X,XX)" no label
    // Seletor: locator que busca por label contendo "Mínimo"
  });

  test.skip('NI — mudança future-dated não afeta faturas passadas', async () => {
    // Critério: mudança de preço a partir de 01/07 → faturas de junho mantêm preço antigo
  });
});
