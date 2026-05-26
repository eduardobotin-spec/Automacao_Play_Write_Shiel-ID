import { test, expect } from '@playwright/test';

import { gerarHash } from '../services/gerarHash.js';
import { processarDocumento } from '../services/processar_documento.js';
import { processarBiometria } from '../services/processar_biometria.js';
import { pollingStatus } from '../services/processar_polling.js';
import { limparBanco } from '../services/limparBanco.js';

test.describe('EQ — Equilíbrio · documento digital', () => {
  // Cenários a adicionar quando o fluxo de documento digital estiver neste pacote.
});

test.describe('EQ — Equilíbrio · documento físico', () => {
  test('Limpar base antes do teste', async () => {
    await limparBanco();
  });

  test('EQ001 - Documento aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, 'EQ001');
    const docResponse = await processarDocumento(request, hash, 'EQ001_APROVADO');
    expect(docResponse.status()).toBe(200);
    const bioResponse = await processarBiometria(request, hash, hash_checker, 'EQ001_APROVADO');
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'EQ001 - Documento aprovado',
    });
    expect(status).toBe('approved');
  });

  test('EQ002 - Spoofing reprovado', async ({ request }) => {
    const { hash } = await gerarHash(request, 'EQ002');
    const docResponse = await processarDocumento(request, hash, 'EQ002_SPOOFING_REPROVADO');
    expect(docResponse.status()).toBe(200);
  });

  test('EQ003 - Multifaces análise', async ({ request }) => {
    const { hash } = await gerarHash(request, 'EQ003');
    const docResponse = await processarDocumento(request, hash, 'EQ003_MULTIFACES_ANALISE');
    expect(docResponse.status()).toBe(200);
  });

  test('EQ005 - Sem movimentos reais análise', async ({ request }) => {
    const { hash } = await gerarHash(request, 'EQ005');
    const docResponse = await processarDocumento(request, hash, 'EQ005_SEM_MOVIMENTOS_REAIS_ANALISE');
    expect(docResponse.status()).toBe(200);
  });

  test('EQ006 - CPF PEP análise', async ({ request }) => {
    const { hash } = await gerarHash(request, 'EQ006');
    const docResponse = await processarDocumento(request, hash, 'EQ006_CPF_PEP_ANALISE');
    expect(docResponse.status()).toBe(200);
  });

  test('EQ007 - Óbito reprovado', async ({ request }) => {
    const { hash } = await gerarHash(request, 'EQ007');
    const docResponse = await processarDocumento(request, hash, 'EQ007_OBITO_REPROVADO');
    expect(docResponse.status()).toBe(200);
  });

  test('EQ008 - Benefício aprovado', async ({ request }) => {
    const { hash } = await gerarHash(request, 'EQ008');
    const docResponse = await processarDocumento(request, hash, 'EQ008_BENEFICIO_APROVADO');
    expect(docResponse.status()).toBe(200);
  });

  test('EQ009 - Menor idade', async ({ request }) => {
    const { hash } = await gerarHash(request, 'EQ009');
    const docResponse = await processarDocumento(request, hash, 'EQ009_MENOR_IDADE');
    expect(docResponse.status()).toBe(200);
  });
});
