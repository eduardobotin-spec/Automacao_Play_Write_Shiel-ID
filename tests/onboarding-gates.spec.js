import { test, expect } from '@playwright/test';

import fs from 'fs';
import path from 'path';

import { mimeFromImagePath, partesMultipartCentros } from '../services/biometriaImagens.js';
import { gerarHash } from '../services/gerarHash.js';
import { pollingStatus } from '../services/processar_polling.js';
import { limparBanco } from '../services/limparBanco.js';

const KYC_API = 'https://kyc.shielid-staging.com';
const TENANT_ID = 'D7n4g9InxXWV52UE';

const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';

const expectedMassaDeTeste = {
  '07114855001': { status: 'approved', statusMessageContains: null },
  '07328769580': { status: 'rejected', statusMessageContains: 'Qualidade insuficiente: faces abaixo do mínimo' },
  '07586429464': { status: 'approved', statusMessageContains: null },
  '07821511323': { status: 'approved', statusMessageContains: null },
  '08281430567': { status: 'approved', statusMessageContains: null },
  '08763855445': { status: 'approved', statusMessageContains: null },
  '11041049625': { status: 'approved', statusMessageContains: null },
  '11406446530': { status: 'approved', statusMessageContains: null },
  '20511748736': { status: 'approved', statusMessageContains: null },
  '36437831839': { status: 'rejected', statusMessageContains: 'Qualidade insuficiente: faces abaixo do mínimo' },
  '41490542825': { status: 'approved', statusMessageContains: null },
};

const expectedSpoofing = {
  '12462644717': { status: 'rejected', statusMessageContains: 'Possível fraude detectada: mesma imagem reutilizada' },
  '14621256629': { status: 'rejected', statusMessageContains: 'Possível fraude detectada: mesma imagem reutilizada' },
  '09244209284': { status: 'rejected', statusMessageContains: 'Não identificado movimento natural' },
  '13288699702': { status: 'rejected', statusMessageContains: 'Não identificado movimento natural' },
  '04288225680': { status: 'rejected', statusMessageContains: 'Possível fraude detectada: mesma imagem reutilizada' },
  '08289203977': { status: 'approved', statusMessageContains: null },
  '16210793924': { status: 'rejected', statusMessageContains: 'Possível fraude detectada: mesma imagem reutilizada' },
  '05472994357': { status: 'approved', statusMessageContains: null },
  '06015754583': { status: 'rejected', statusMessageContains: 'Possível fraude detectada: mesma imagem reutilizada' },
  '33228165833': { status: 'rejected', statusMessageContains: 'Não identificado movimento natural' },
};

function assertGateScenarioResult(result, expected) {
  expect(result.status).toBe(expected.status);
  if (expected.statusMessageContains == null) {
    expect(result.statusMessage ?? null).toBeNull();
    return;
  }
  expect(result.statusMessage ?? '').toContain(expected.statusMessageContains);
}

function assertGateScenarioExpected(cpf, result, expectedMap) {
  const expected = expectedMap[cpf];
  if (expected) {
    assertGateScenarioResult(result, expected);
    return;
  }
  // Sem baseline informado: valida apenas estrutura mínima do retorno.
  expect(['approved', 'rejected', 'analysis', 'error', 'pending']).toContain(result.status);
}

function basicAuthHeader() {
  return `Basic ${Buffer.from(`${apiUser}:${apiPass}`).toString('base64')}`;
}

function massaDir(...parts) {
  return path.join(process.cwd(), 'biometria', 'MassaDeTeste', ...parts);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enviarBiometria(request, hash, relCpfDir, nomeCenarioErro) {
  const base = massaDir(relCpfDir);
  const parts = partesMultipartCentros(base, nomeCenarioErro);

  const url = `${KYC_API}/api/v1/biometry/${TENANT_ID}/${hash}/process-biometry`;
  const maxTentativas = Number(process.env.KYC_BIO_MAX_TENTATIVAS || 4);
  const intervaloTentativasMs = Number(process.env.KYC_BIO_RETRY_INTERVAL_MS || 1500);

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    const fd = new FormData();
    for (const p of parts) {
      const buf = fs.readFileSync(p.filePath);
      fd.append('files', new Blob([buf], { type: mimeFromImagePath(p.filePath) }), p.name);
    }

    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers: { Authorization: basicAuthHeader() },
      body: fd,
    });

    const text = await fetchResponse.text();

    let taskId;
    try {
      const body = JSON.parse(text);
      taskId = body.task_id ?? body.taskId ?? body.data?.task_id;
    } catch {
      /* */
    }

    if (taskId) {
      return { taskId };
    }

    const sessaoNaoEncontrada =
      fetchResponse.status === 404 && /sess[aã]o n[aã]o encontrada|hash n[aã]o encontrada/i.test(text);

    if (sessaoNaoEncontrada && tentativa < maxTentativas) {
      await sleep(intervaloTentativasMs);
      continue;
    }

    throw new Error(
      `enviarBiometria: resposta sem taskId (HTTP ${fetchResponse.status}, tentativa ${tentativa}/${maxTentativas}). ${text}`
    );
  }

  throw new Error('enviarBiometria: falha inesperada ao processar biometria.');
}

test.describe('GATES — MassaDeTeste (KYC → biometria → polling)', () => {
  test('Limpar base antes do teste', async () => {
    await limparBanco();
  });

  // Cada pasta representa um CPF (cenário independente).
  // MassaDeTeste: usar somente CPFs existentes como nome de pasta.
  const cpfs = [
    '03853243088',
    '04319904257',
    '04714039547',
    '05542615708',
    '05883287077',
    '05972738988',
    '06844623542',
    '07114855001',
    '07328769580',
    '07586429464',
    '07821511323',
    '08281430567',
    '08763855445',
    '11041049625',
    '11406446530',
    '20511748736',
    '36437831839',
    '41490542825',
  ];

  for (const cpf of cpfs) {
    test(`${cpf} - MassaDeTeste`, async ({ request }) => {
      const { hash, hash_checker } = await gerarHash(request, cpf, { mode: 'biometria' });
      const bioResponse = await enviarBiometria(request, hash, cpf, `${cpf} - MassaDeTeste`);
      const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
        cpf,
        nomeCenario: `${cpf} - MassaDeTeste`,
        returnDetails: true,
      });
      assertGateScenarioExpected(cpf, result, expectedMassaDeTeste);
    });
  }

  // Subpasta Spoofing também contém CPFs com 6 imagens.
  const spoofingCpfs = [
    '12462644717',
    '14621256629',
    '09244209284',
    '13288699702',
    '04288225680',
    '08289203977',
    '16210793924',
    '05472994357',
    '06015754583',
    '33228165833',
  ];

  for (const cpf of spoofingCpfs) {
    test(`${cpf} - MassaDeTeste/Spoofing`, async ({ request }) => {
      const { hash, hash_checker } = await gerarHash(request, cpf, { mode: 'biometria' });
      const bioResponse = await enviarBiometria(
        request,
        hash,
        path.join('Spoofing', cpf),
        `${cpf} - MassaDeTeste/Spoofing`
      );
      const result = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, {
        cpf,
        nomeCenario: `${cpf} - MassaDeTeste/Spoofing`,
        returnDetails: true,
      });
      assertGateScenarioExpected(cpf, result, expectedSpoofing);
    });
  }
});
