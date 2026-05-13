import fs from 'fs';
import path from 'path';

import { mimeFromImagePath, partesMultipartCentros } from './biometriaImagens.js';

const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';

const KYC_API = 'https://kyc.shielid-staging.com';
const TENANT_ID = 'D7n4g9InxXWV52UE';

function basicAuthHeader(clientAuth = null) {
  const authUser = String(clientAuth?.apiUser ?? apiUser).trim();
  const authPass = String(clientAuth?.apiPass ?? apiPass).trim();
  return `Basic ${Buffer.from(`${authUser}:${authPass}`).toString('base64')}`;
}

/** Repositório na raiz **ou** pasta `automacao-2.0` (quando o `cwd` é essa pasta). */
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

function aliasesCenarioBiometria(cenarioId) {
  const id = String(cenarioId ?? '');
  const upper = id.toUpperCase();

  if (upper === 'ZOOM' || upper === 'CA011') {
    return [id, 'CA011_Zoom', 'CA011_ZOOM', 'ZOOM'];
  }

  return [id];
}

function baseDirBiometria(cenarioId) {
  const a2 = automacao2Root();
  const aliases = aliasesCenarioBiometria(cenarioId);

  for (const alias of aliases) {
    const local = path.join(a2, 'biometria', alias);
    if (fs.existsSync(local)) return local;
  }

  for (const alias of aliases) {
    const fromFixtures = path.join(repoRoot(), 'fixtures', 'biometria', alias);
    if (fs.existsSync(fromFixtures)) return fromFixtures;
  }

  return path.join(a2, 'biometria', aliases[0]);
}

/**
 * Envia exatamente CENTER_1 … CENTER_6 (aceita png/jpg/jpeg; validação prévia obrigatória).
 */
export async function processarBiometria(_request, hash, hash_checker, cenarioId, options = {}) {
  void hash_checker;
  const base = baseDirBiometria(cenarioId);
  const parts = partesMultipartCentros(base, cenarioId);
  const url = `${KYC_API}/api/v1/biometry/${TENANT_ID}/${hash}/process-biometry`;

  const fd = new FormData();
  for (const p of parts) {
    const buf = fs.readFileSync(p.filePath);
    fd.append('files', new Blob([buf], { type: mimeFromImagePath(p.filePath) }), p.name);
  }

  const fetchResponse = await fetch(url, {
    method: 'POST',
    headers: { Authorization: basicAuthHeader(options?.clientAuth ?? null) },
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
  return {
    status: () => fetchResponse.status,
    ok: () => fetchResponse.ok,
    text: async () => text,
    taskId,
  };
}
