import { test, expect } from '@playwright/test';

import { gerarHash } from '../services/gerarHash.js';
import { pollingStatus } from '../services/processar_polling.js';
import { enviarBiometria } from '../services/enviarBiometria.js';
import { limparBanco } from '../services/limparBanco.js';

test.describe('GATES — MassaDeTeste (Refatorado CA001)', () => {

  test('Limpar base antes do teste', async () => {
    await limparBanco();
  });

  // =========================
  // MASSA DE TESTE
  // =========================

  test('03853243088 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '03853243088');
    const bioResponse = await enviarBiometria(request, hash, '03853243088', '03853243088 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '03853243088 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  test('04319904257 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '04319904257');
    const bioResponse = await enviarBiometria(request, hash, '04319904257', '04319904257 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '04319904257 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  test('04714039547 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '04714039547');
    const bioResponse = await enviarBiometria(request, hash, '04714039547', '04714039547 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '04714039547 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  test('05542615708 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '05542615708');
    const bioResponse = await enviarBiometria(request, hash, '05542615708', '05542615708 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '05542615708 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  test('05883287077 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '05883287077');
    const bioResponse = await enviarBiometria(request, hash, '05883287077', '05883287077 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '05883287077 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  test('05972738988 | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '05972738988');
    const bioResponse = await enviarBiometria(request, hash, '05972738988', '05972738988 | Reprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '05972738988 | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
    expect(result.statusMessage ?? '').toContain('Biometria facial abaixo de 40');
    expect(result.statusMessage ?? '').toContain('Pontos de similaridade');
  });

  test('06844623542 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '06844623542');
    const bioResponse = await enviarBiometria(request, hash, '06844623542', '06844623542 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '06844623542 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  test('07114855001 | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '07114855001');
    const bioResponse = await enviarBiometria(request, hash, '07114855001', '07114855001 | Reprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '07114855001 | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
    expect(result.statusMessage ?? '').toContain('Biometria facial abaixo de 40');
    expect(result.statusMessage ?? '').toContain('Pontos de similaridade');
  });

  test('07328769580 | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '07328769580');
    const bioResponse = await enviarBiometria(request, hash, '07328769580', '07328769580 | Reprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '07328769580 | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
    expect(result.statusMessage ?? '').toContain('Qualidade insuficiente');
    expect(result.statusMessage ?? '').toContain('faces abaixo do mínimo');
  });

  test('07586429464 | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '07586429464');
    const bioResponse = await enviarBiometria(request, hash, '07586429464', '07586429464 | Reprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '07586429464 | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
    expect(result.statusMessage ?? '').toContain('Biometria facial abaixo de 40');
    expect(result.statusMessage ?? '').toContain('Pontos de similaridade');
  });

  test('07821511323 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '07821511323');
    const bioResponse = await enviarBiometria(request, hash, '07821511323', '07821511323 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '07821511323 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  test('08281430567 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '08281430567');
    const bioResponse = await enviarBiometria(request, hash, '08281430567', '08281430567 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '08281430567 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  test('08763855445 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '08763855445');
    const bioResponse = await enviarBiometria(request, hash, '08763855445', '08763855445 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '08763855445 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  test('11041049625 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '11041049625');
    const bioResponse = await enviarBiometria(request, hash, '11041049625', '11041049625 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '11041049625 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  test('11406446530 | Fallback', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '11406446530');
    const bioResponse = await enviarBiometria(request, hash, '11406446530', '11406446530 | Fallback');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '11406446530 | Fallback',
      returnDetails: true,
    });
    expect(['analysis', 'approved']).toContain(result.status);
  });

  test('20511748736 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '20511748736');
    const bioResponse = await enviarBiometria(request, hash, '20511748736', '20511748736 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '20511748736 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  test('36437831839 | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '36437831839');
    const bioResponse = await enviarBiometria(request, hash, '36437831839', '36437831839 | Reprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '36437831839 | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
    expect(result.statusMessage ?? '').toContain('Biometria facial abaixo de 40');
    expect(result.statusMessage ?? '').toContain('Pontos de similaridade');
  });

  test('41490542825 | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '41490542825');
    const bioResponse = await enviarBiometria(request, hash, '41490542825', '41490542825 | Aprovado');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '41490542825 | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
  });

  // =========================
  // SPOOFING
  // =========================

  test('12462644717 | Spoofing | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '12462644717');
    const bioResponse = await enviarBiometria(request, hash, 'Spoofing/12462644717', '12462644717 - Spoofing');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '12462644717 | Spoofing | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
    expect(result.statusMessage ?? '').toContain('Possível fraude detectada');
    expect(result.statusMessage ?? '').toContain('mesma imagem reutilizada');
  });

  test('14621256629 | Spoofing | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '14621256629');
    const bioResponse = await enviarBiometria(request, hash, 'Spoofing/14621256629', '14621256629 - Spoofing');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '14621256629 | Spoofing | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
    expect(result.statusMessage ?? '').toContain('Possível fraude detectada');
    expect(result.statusMessage ?? '').toContain('mesma imagem reutilizada');
  });

  test('09244209284 | Spoofing | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '09244209284');
    const bioResponse = await enviarBiometria(request, hash, 'Spoofing/09244209284', '09244209284 - Spoofing');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '09244209284 | Spoofing | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
    expect(result.statusMessage ?? '').toContain('Não identificado movimento natural');
  });

  test('13288699702 | Spoofing | Aprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '13288699702');
    const bioResponse = await enviarBiometria(request, hash, 'Spoofing/13288699702', '13288699702 - Spoofing');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '13288699702 | Spoofing | Aprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('approved');
    expect(result.statusMessage ?? '').toContain('Não identificado movimento natural');
  });

  test('04288225680 | Spoofing | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '04288225680');
    const bioResponse = await enviarBiometria(request, hash, 'Spoofing/04288225680', '04288225680 - Spoofing');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '04288225680 | Spoofing | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
    expect(result.statusMessage ?? '').toContain('Possível fraude detectada');
    expect(result.statusMessage ?? '').toContain('mesma imagem reutilizada');
    expect(result.statusMessage ?? '').toContain('Biometria facial abaixo de 40');
    expect(result.statusMessage ?? '').toContain('Pontos de similaridade');
  });

  test('08289203977 | Spoofing | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '08289203977');
    const bioResponse = await enviarBiometria(request, hash, 'Spoofing/08289203977', '08289203977 - Spoofing');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '08289203977 | Spoofing | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
  });

  test('16210793924 | Spoofing | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '16210793924');
    const bioResponse = await enviarBiometria(request, hash, 'Spoofing/16210793924', '16210793924 - Spoofing');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '16210793924 | Spoofing | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
    expect(result.statusMessage ?? '').toContain('Possível fraude detectada');
    expect(result.statusMessage ?? '').toContain('mesma imagem reutilizada');
  });

  test('05472994357 | Spoofing | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '05472994357');
    const bioResponse = await enviarBiometria(request, hash, 'Spoofing/05472994357', '05472994357 - Spoofing');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '05472994357 | Spoofing | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
  });

  test('06015754583 | Spoofing | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '06015754583');
    const bioResponse = await enviarBiometria(request, hash, 'Spoofing/06015754583', '06015754583 - Spoofing');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '06015754583 | Spoofing | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
    expect(result.statusMessage ?? '').toContain('Possível fraude detectada');
    expect(result.statusMessage ?? '').toContain('mesma imagem reutilizada');
  });

  test('33228165833 | Spoofing | Reprovado', async ({ request }) => {
    const { hash, hash_checker, cpf } = await gerarHash(request, '33228165833');
    const bioResponse = await enviarBiometria(request, hash, 'Spoofing/33228165833', '33228165833 - Spoofing');
    const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
      cpf,
      nomeCenario: '33228165833 | Spoofing | Reprovado',
      returnDetails: true,
    });
    expect(result.status).toBe('rejected');
    expect(result.statusMessage ?? '').toContain('Não identificado movimento natural');
  });

});