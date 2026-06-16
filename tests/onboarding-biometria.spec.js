import { test, expect } from '@playwright/test';

import { gerarHash } from '../services/gerarHash.js';
import { processarBiometria } from '../services/processar_biometria.js';
import { pollingStatus } from '../services/processar_polling.js';
import { limparBanco } from '../services/limparBanco.js';
import { gerarMassaBiometria } from '../GerarMassa.js';

test.describe('CA — Conversão alta (KYC → biometria → polling)', () => {
  test('Limpar base antes do teste', async () => {
    await limparBanco();
  });

  /**
   * Cenários validados com base no retorno observado na dashboard (Shield-ID).
   * Padrão: cada CPF é tratado como o id da pasta de biometria (`biometria/<CPF>` ou `fixtures/biometria/<CPF>`),
   * aproveitando a resolução já existente em `processar_biometria.js`.
   */

  test('CA001 - Onboarding Padrão || Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, 'CA001', { mode: 'biometria' });
    const bioResponse = await processarBiometria(request, hash, hash_checker, 'CA001_APROVADO');
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'CA001 - Onboarding Padrão || Aprovado',
    });
    expect(status).toBe('approved');
  });

  test('CA002 - Onboarding com Spoofing || Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, 'CA002', { mode: 'biometria' });
    const bioResponse = await processarBiometria(request, hash, hash_checker, 'CA002_SPOOFING_REPROVADO');
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'CA002 - Onboarding com Spoofing || Reprovado',
    });
    expect(status).toBe('rejected');
  });

  test('CA003 - Onboarding com Multifaces || Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, 'CA003', { mode: 'biometria' });
    const bioResponse = await processarBiometria(request, hash, hash_checker, 'CA003_MULTIFACES_ANALISE');
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'CA003 - Onboarding com Multifaces || Reprovado',
    });
    expect(status).toBe('rejected');
  });

  test('CA005 - Onboarding Sem movimentos reais || Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, 'CA005', { mode: 'biometria' });
    const bioResponse = await processarBiometria(request, hash, hash_checker, 'CA005_SEM_MOVIMENTOS_REAIS_ANALISE');
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'CA005 - Onboarding Sem movimentos reais || Reprovado',
    });
    expect(status).toBe('rejected');
  });

  test('CA006 - Onboarding com CPF PEP || Aprovado/Análise/Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, 'CA006', { mode: 'biometria' });
    const bioResponse = await processarBiometria(request, hash, hash_checker, 'CA006_CPF_PEP_ANALISE');
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'CA006 - Onboarding com CPF PEP || Aprovado/Análise/Reprovado',
    });
    expect(['approved', 'analysis', 'rejected']).toContain(status);
  });

  test('CA007 - Onboarding de CPF em Óbito || Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, 'CA007', { mode: 'biometria' });
    const bioResponse = await processarBiometria(request, hash, hash_checker, 'CA007_OBITO_REPROVADO');
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'CA007 - Onboarding de CPF em Óbito || Reprovado',
    });
    expect(status).toBe('rejected');
  });

  test('CA008 - Onboarding com CPF de Benefício || Aprovado/Análise/Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, 'CA008', { mode: 'biometria' });
    const bioResponse = await processarBiometria(request, hash, hash_checker, 'CA008_BENEFICIO_APROVADO');
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'CA008 - Onboarding com CPF de Benefício || Aprovado/Análise/Reprovado',
    });
    expect(['approved', 'analysis', 'rejected']).toContain(status);
  });

  test('CA009 - Onboarding com CPF de Menor idade || Análise/Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, 'CA009', { mode: 'biometria' });
    const bioResponse = await processarBiometria(request, hash, hash_checker, 'CA009_MENOR_IDADE');
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'CA009 - Onboarding com CPF de Menor idade || Análise/Reprovado',
    });
    expect(['approved', 'analysis', 'rejected']).toContain(status);
  });

  test('CA010 - Onboarding com CPF normal || Sem faces identificáveis || Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, 'CA010', { mode: 'biometria' });
    const bioResponse = await processarBiometria(request, hash, hash_checker, 'CA010_CPF_NORMAL_SEM_FACES_IDENTIFICAVEIS_REPROVADO');
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'CA010 - Onboarding com CPF normal || Sem faces identificáveis || Aprovado',
    });
    expect(status).toBe('approved');
  });

  test('CA011 - Onboarding com ZOOM', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, 'CA011', { mode: 'biometria' });
    const bioResponse = await processarBiometria(request, hash, hash_checker, 'CA011');
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'CA011 - Onboarding com ZOOM',
    });
    expect(['approved', 'analysis', 'rejected']).toContain(status);
  });

  // test('CA012 - Onboarding com imagem anime', async ({ request }) => {
  //   const { hash, hash_checker, cpf } = await gerarHash(request, 'CA012');
  //   const bioResponse = await processarBiometria(request, hash, hash_checker, 'ANIME');
  //   const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
  //     cpf,
  //     nomeCenario: 'CA012 - Onboarding com imagem anime',
  //   });
  //   expect(['approved', 'analysis', 'rejected']).toContain(status);
  // });

  // test('CA013 - Onboarding com imagem em desenho 3D', async ({ request }) => {
  //   const { hash, hash_checker, cpf } = await gerarHash(request, 'CA013');
  //   const bioResponse = await processarBiometria(request, hash, hash_checker, 'DESENHO_3D');
  //   const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
  //     cpf,
  //     nomeCenario: 'CA013 - Onboarding com imagem em desenho 3D',
  //   });
  //   expect(['approved', 'analysis', 'rejected']).toContain(status);
  // });

  // test('CA014 - Onboarding com imagem cartoon', async ({ request }) => {
  //   const { hash, hash_checker, cpf } = await gerarHash(request, 'CA014');
  //   const bioResponse = await processarBiometria(request, hash, hash_checker, 'CARTOON');
  //   const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
  //     cpf,
  //     nomeCenario: 'CA014 - Onboarding com imagem cartoon',
  //   });
  //   expect(['approved', 'analysis', 'rejected']).toContain(status);
  // });

});

test.describe('Casos Gerados', () => {
  test('massaGerada - CT001 cenario aprovado', async ({ request }) => {
    const cenarioMassa = 'massaGerada/CT001_CENARIO_APROVADO';
    const massa = await gerarMassaBiometria({ scenarioName: cenarioMassa, nomeAlvo: 'leonardo' });
    const cpfMassa = String(massa?.cpfSelecionado ?? '').replace(/\D/g, '');
    expect(cpfMassa).toBeTruthy();
    expect(cpfMassa).not.toBe('23134061805');

    const { hash, hash_checker, cpf } = await gerarHash(request, cpfMassa, { mode: 'biometria' });
    const bioResponse = await processarBiometria(request, hash, hash_checker, cenarioMassa);
    const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: 'massaGerada - CT001 cenario aprovado',
    });
    expect(status).toBe('approved');
  });
});
