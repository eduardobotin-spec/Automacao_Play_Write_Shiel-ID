import fs from 'fs';
import path from 'path';

import { mimeFromImagePath, partesMultipartCentros } from './biometriaImagens.js';

const KYC_API = 'https://kyc.shielid-staging.com';
const TENANT_ID = 'D7n4g9InxXWV52UE';

const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';

function basicAuthHeader() {
  return `Basic ${Buffer.from(`${apiUser}:${apiPass}`).toString('base64')}`;
}

function massaDir(...parts) {
  return path.join(process.cwd(), 'biometria', 'MassaDeTeste', ...parts);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Envia biometria da MassaDeTeste (pasta `biometria/MassaDeTeste/<relCpfDir>`).
 * Retorna `{ taskId }` para ser usado no polling.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} hash
 * @param {string} relCpfDir - ex.: '03853243088' ou 'Spoofing/12462644717'
 * @param {string} nomeCenarioErro - usado na validação de pasta/mensagens de erro
 */
export async function enviarBiometria(_request, hash, relCpfDir, nomeCenarioErro) {
  void _request;
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

