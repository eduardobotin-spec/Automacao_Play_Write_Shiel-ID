import fs from 'fs';
import path from 'path';

import { appendApiResultBlock } from './apiResultLog.js';

const KYC_API = 'https://kyc.shielid-staging.com';
const TENANT_ID = 'D7n4g9InxXWV52UE';

const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'image/jpeg';
}

function extrairCpfRetornoDocumento(retornoResponse) {
  if (retornoResponse == null || typeof retornoResponse !== 'object') return '';
  const raw =
    retornoResponse.session_status?.document_expected ??
    retornoResponse.data?.session_status?.document_expected ??
    retornoResponse.response?.session_status?.document_expected ??
    '';
  return String(raw).replace(/\D/g, '');
}

function automacao2Root() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'biometria'))) return cwd;
  return path.join(cwd, 'automacao-2.0');
}

function repoRoot() {
  const cwd = process.cwd();
  if (path.basename(cwd) === 'automacao-2.0') return path.join(cwd, '..');
  return cwd;
}

function resolveDocumentoFisico(cenarioId) {
  const a2 = automacao2Root();
  const bases = [
    path.join(a2, 'documento_fisico', cenarioId),
    path.join(repoRoot(), 'fixtures', 'documento_fisico', cenarioId),
  ];
  const tryFrente = ['frente.jpeg', 'frente.jpg', 'frente.png'];
  const tryVerso = ['verso.jpeg', 'verso.jpg', 'verso.png'];
  for (const base of bases) {
    if (!fs.existsSync(base)) continue;
    const f = tryFrente.map((n) => path.join(base, n)).find((p) => fs.existsSync(p));
    const v = tryVerso.map((n) => path.join(base, n)).find((p) => fs.existsSync(p));
    if (f && v) return { frente: f, verso: v };
  }
  const base = bases[0];
  return {
    frente: path.join(base, 'frente.jpeg'),
    verso: path.join(base, 'verso.jpeg'),
  };
}

/**
 * Frente + verso; devolve a resposta do POST do verso (pode usar .status()).
 */
export async function processarDocumento(request, hash, cenarioId) {
  const url = `${KYC_API}/api/v1/kyc/${TENANT_ID}/${hash}/process-document`;
  const { frente, verso } = resolveDocumentoFisico(cenarioId);
  if (!fs.existsSync(frente) || !fs.existsSync(verso)) {
    throw new Error(
      `processarDocumento: ficheiros não encontrados para ${cenarioId}. Tente: ${frente}, ${verso}`
    );
  }

  const authHeader = `Basic ${Buffer.from(`${apiUser}:${apiPass}`).toString('base64')}`;

  await request.post(url, {
    headers: { Authorization: authHeader },
    multipart: {
      document_side: 'front',
      document_image: {
        name: path.basename(frente),
        mimeType: mimeFromPath(frente),
        buffer: fs.readFileSync(frente),
      },
    },
  });

  await sleep(3000);

  const backResponse = await request.post(url, {
    headers: { Authorization: authHeader },
    multipart: {
      document_side: 'back',
      document_image: {
        name: path.basename(verso),
        mimeType: mimeFromPath(verso),
        buffer: fs.readFileSync(verso),
      },
    },
  });

  const rawText = await backResponse.text();
  let retornoResponse;
  try {
    retornoResponse = JSON.parse(rawText);
  } catch {
    retornoResponse = rawText;
  }
  appendApiResultBlock({
    nomeCenario: String(cenarioId),
    cpf: extrairCpfRetornoDocumento(retornoResponse),
    retornoResponse,
  });

  return backResponse;
}

export async function enviarDocumentoFisico(request, hash, caminhoFrente, caminhoVerso) {
  const url = `${KYC_API}/api/v1/kyc/${TENANT_ID}/${hash}/process-document`;
  const authHeader = `Basic ${Buffer.from(`${apiUser}:${apiPass}`).toString('base64')}`;

  const frontResponse = await request.post(url, {
    headers: { Authorization: authHeader },
    multipart: {
      document_side: 'front',
      document_image: {
        name: path.basename(caminhoFrente),
        mimeType: mimeFromPath(caminhoFrente),
        buffer: fs.readFileSync(caminhoFrente),
      },
    },
  });
  await sleep(3000);
  const backResponse = await request.post(url, {
    headers: { Authorization: authHeader },
    multipart: {
      document_side: 'back',
      document_image: {
        name: path.basename(caminhoVerso),
        mimeType: mimeFromPath(caminhoVerso),
        buffer: fs.readFileSync(caminhoVerso),
      },
    },
  });
  return {
    frontStatus: frontResponse.status(),
    backStatus: backResponse.status(),
  };
}
