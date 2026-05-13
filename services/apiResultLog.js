import fs from 'fs';
import path from 'path';
import { generateArtifactsForLog } from './logArtifacts.js';

let logFilePath;
let logRunId;
let logSpecName;
let logDateFolder;
const blocosLog = [];
const resumoExecucao = {
  executados: 0,
  aprovados: 0,
  reprovados: 0,
  falhou: 0,
};

function stampLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function dateFolderLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toSafePathSegment(value, fallback = 'geral') {
  const raw = String(value ?? '')
    .trim()
    .replace(/\.[^/.]+$/, '');
  const safe = raw.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, '-');
  return safe.length > 0 ? safe : fallback;
}

function detectarSpecName() {
  if (process.env.KYC_LOG_SPEC) return toSafePathSegment(process.env.KYC_LOG_SPEC);
  const stack = String(new Error().stack ?? '');
  const lines = stack.split('\n');
  for (const line of lines) {
    const m = line.match(/tests[\\/](.+?\.spec\.js)/i);
    if (m?.[1]) {
      const fileName = path.basename(m[1], '.spec.js');
      return toSafePathSegment(fileName, 'spec');
    }
  }
  return 'geral';
}

export function escaparNomeCenarioLinhaUnica(value) {
  return String(value ?? '').replace(/\r?\n/g, ' ');
}

function normalizarCpf(cpf) {
  const digits = String(cpf ?? '').replace(/\D/g, '');
  return digits || '';
}

function extrairSessionStatus(retornoResponse) {
  if (retornoResponse == null || typeof retornoResponse !== 'object') return null;
  if (retornoResponse.session_status && typeof retornoResponse.session_status === 'object') {
    return retornoResponse.session_status;
  }
  if (retornoResponse.data?.session_status && typeof retornoResponse.data.session_status === 'object') {
    return retornoResponse.data.session_status;
  }
  if (retornoResponse.response?.session_status && typeof retornoResponse.response.session_status === 'object') {
    return retornoResponse.response.session_status;
  }
  return null;
}

const SESSION_STATUS_ALLOWED_FIELDS = [
  'success',
  'hash',
  'hash_checker',
  'client_id',
  'person_type',
  'type',
  'status',
  'status_message',
  'current_step',
  'next_step',
  'validate_data',
  'steps',
];

function filtrarSessionStatus(sessionStatus) {
  if (sessionStatus == null || typeof sessionStatus !== 'object') return null;
  const filtered = {};
  for (const key of SESSION_STATUS_ALLOWED_FIELDS) {
    if (key in sessionStatus) filtered[key] = sessionStatus[key];
  }
  return filtered;
}

/**
 * Serializa apenas o bloco de sessão informado pela API.
 */
export function formatarRetornoResponse(retornoResponse) {
  if (
    retornoResponse != null &&
    typeof retornoResponse === 'object' &&
    typeof retornoResponse.timeout_message === 'string'
  ) {
    const rawResponse =
      retornoResponse.response != null ? retornoResponse.response : retornoResponse;
    const sessionStatus = filtrarSessionStatus(extrairSessionStatus(rawResponse));
    return JSON.stringify(
      {
        session_status: sessionStatus,
        error_message: retornoResponse.timeout_message,
        raw_response: rawResponse,
      },
      null,
      2
    );
  }

  const sessionStatus = filtrarSessionStatus(extrairSessionStatus(retornoResponse));
  if (sessionStatus != null) {
    // Mantém compatibilidade com parser atual e permite anexar
    // dados extras para validação humana (consultas em banco).
    const payload = { session_status: sessionStatus };
    if (
      retornoResponse != null &&
      typeof retornoResponse === 'object' &&
      'raw_response' in retornoResponse
    ) {
      payload.raw_response = retornoResponse.raw_response;
    }
    if (
      retornoResponse != null &&
      typeof retornoResponse === 'object' &&
      'extra_sections' in retornoResponse
    ) {
      payload.extra_sections = retornoResponse.extra_sections;
    }
    return JSON.stringify(payload, null, 2);
  }

  if (typeof retornoResponse === 'string') {
    return JSON.stringify(
      {
        session_status: null,
        error_message: retornoResponse,
      },
      null,
      2
    );
  }

  if (retornoResponse != null && typeof retornoResponse === 'object') {
    return JSON.stringify(
      {
        session_status: null,
        raw_response: retornoResponse,
      },
      null,
      2
    );
  }

  return JSON.stringify({ session_status: null }, null, 2);
}

function formatarJsonGenerico(valor) {
  if (typeof valor === 'string') {
    try {
      return JSON.stringify(JSON.parse(valor), null, 2);
    } catch {
      return JSON.stringify({ value: valor }, null, 2);
    }
  }

  if (valor == null) {
    return JSON.stringify(null, null, 2);
  }

  try {
    return JSON.stringify(valor, null, 2);
  } catch {
    return JSON.stringify({ error: 'Falha ao serializar JSON' }, null, 2);
  }
}

function atualizarResumo(retornoResponse) {
  resumoExecucao.executados += 1;
  const sessionStatus = extrairSessionStatus(retornoResponse);
  const status = String(sessionStatus?.status ?? '').toLowerCase();
  if (status === 'approved') {
    resumoExecucao.aprovados += 1;
    return;
  }
  if (status === 'rejected') {
    resumoExecucao.reprovados += 1;
    return;
  }
  resumoExecucao.falhou += 1;
}

function montarTopoResumo() {
  return (
    'RESUMO\n' +
    `TESTES_EXECUTADOS: ${resumoExecucao.executados}\n` +
    `APROVADOS: ${resumoExecucao.aprovados}\n` +
    `REPROVADOS: ${resumoExecucao.reprovados}\n` +
    `FALHOU: ${resumoExecucao.falhou}\n\n`
  );
}

/**
 * Um ficheiro .txt por processo Playwright.
 * Estrutura: logs_txt/daily/YYYY-MM-DD/<spec>/<runId>/api-resultados_<runId>.txt
 * Cada cenário: NOME_CENARIO + RETORNO RESPONSE (apenas session_status).
 */
export function appendApiResultBlock({
  nomeCenario = '',
  cpf = '',
  retornoResponse,
  secoesJson = [],
  ignorarContagemResumo = false,
}) {
  const logsDir = path.join(process.cwd(), 'logs_txt');
  fs.mkdirSync(logsDir, { recursive: true });
  if (!logFilePath) {
    logRunId = stampLocal();
    logDateFolder = dateFolderLocal();
    logSpecName = detectarSpecName();
    const runDir = path.join(logsDir, 'daily', logDateFolder, logSpecName, logRunId);
    fs.mkdirSync(runDir, { recursive: true });
    logFilePath = path.join(runDir, `api-resultados_${logRunId}.txt`);
  }
  const line = escaparNomeCenarioLinhaUnica(nomeCenario);
  const cpfLine = normalizarCpf(cpf);
  const jsonBlock = formatarRetornoResponse(retornoResponse);

  let blocosExtras = '';
  for (const secao of secoesJson) {
    const titulo = String(secao?.titulo ?? '').trim();
    if (!titulo) continue;
    const jsonSecao = formatarJsonGenerico(secao?.data);
    blocosExtras += `${titulo}:\n${jsonSecao}\n\n`;
  }

  const block =
    `NOME_CENARIO: ${line}\nCPF: ${cpfLine}\n\nRETORNO RESPONSE:\n${jsonBlock}\n\n` +
    blocosExtras;

  if (!ignorarContagemResumo) {
    atualizarResumo(retornoResponse);
  }
  blocosLog.push(block);
  const content = montarTopoResumo() + blocosLog.join('');
  fs.writeFileSync(logFilePath, content, 'utf8');
  void generateArtifactsForLog(logFilePath);
}
