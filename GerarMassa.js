import fs from 'fs';
import path from 'path';
import * as baseDados from './services/baseDados.js';
import { getLogsGeral } from './services/consultarLogsGeral.js';

function sanitizeScenarioName(name) {
  const safe = String(name ?? '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '_');
  if (!safe) throw new Error('GerarMassa: scenarioName inválido.');
  return safe;
}

function sanitizeScenarioPath(scenarioName) {
  const raw = String(scenarioName ?? '').trim();
  if (!raw) throw new Error('GerarMassa: scenarioName inválido.');
  const parts = raw.split(/[\\/]+/).filter(Boolean).map(sanitizeScenarioName);
  if (!parts.length) throw new Error('GerarMassa: scenarioName inválido.');
  return parts;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeCpf(value) {
  const cpf = String(value ?? '').replace(/\D/g, '');
  return /^\d{11}$/.test(cpf) ? cpf : null;
}

function cpfsBaseBloqueados() {
  const set = new Set();
  for (const value of Object.values(baseDados)) {
    const cpf = normalizeCpf(value);
    if (cpf) set.add(cpf);
  }
  return set;
}

function findOcrValue(ocrArray, label) {
  if (!Array.isArray(ocrArray)) return null;
  const target = normalizeText(label);
  const item = ocrArray.find((entry) => normalizeText(entry?.label) === target);
  return item?.value ?? null;
}

function hashFromUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments.length ? segments[segments.length - 1] : null;
  } catch {
    return null;
  }
}

function sessionStatusFromLogDataColumn(dataCol) {
  if (!dataCol || typeof dataCol !== 'object') return null;
  const outer = dataCol.session_status;
  if (outer && typeof outer === 'object' && outer.status != null) {
    return String(outer.status).toLowerCase().trim();
  }
  const inner = dataCol.data;
  if (inner && typeof inner === 'object' && inner.session_status?.status != null) {
    return String(inner.session_status.status).toLowerCase().trim();
  }
  return null;
}

function toMassCandidate(row) {
  const payload = row?.data?.data ?? row?.data ?? {};
  const ocr = Array.isArray(payload?.ocr) ? payload.ocr : [];
  const name = findOcrValue(ocr, 'name');
  const cpf = normalizeCpf(findOcrValue(ocr, 'cpf') ?? payload?.document);
  const images = Array.isArray(payload?.face?.images) ? payload.face.images.filter(Boolean) : [];
  return {
    rowId: row?.id ?? null,
    createdAt: row?.created_at ?? null,
    name,
    cpf,
    images,
    kycUrl: payload?.url ?? null,
    hash: payload?.hash ?? hashFromUrl(payload?.url),
    sessionStatus: sessionStatusFromLogDataColumn(row?.data),
  };
}

function prepararPastaDestino(scenarioName) {
  const safeParts = sanitizeScenarioPath(scenarioName);
  const targetDir = path.join(process.cwd(), 'biometria', ...safeParts);
  fs.mkdirSync(targetDir, { recursive: true });
  for (let i = 1; i <= 6; i += 1) {
    const f = path.join(targetDir, `CENTER_${i}.png`);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  return targetDir;
}

async function baixarImagem(url, targetPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem (${response.status}): ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(targetPath, buffer);
}

async function salvarSeisImagens(images, targetDir, limit) {
  const urls = images.slice(0, limit);
  if (urls.length < limit) {
    throw new Error(`GerarMassa: apenas ${urls.length} URLs de imagem. Esperado: ${limit}.`);
  }
  for (let i = 0; i < limit; i += 1) {
    const targetPath = path.join(targetDir, `CENTER_${i + 1}.png`);
    await baixarImagem(urls[i], targetPath);
  }
}

async function buscarCandidatos({ nomeAlvo, cpfAlvo, limiteConsulta }) {
  if (cpfAlvo) {
    const res = await getLogsGeral({
      limit: limiteConsulta,
      where: 'where data::text ilike $1',
      params: [`%${cpfAlvo}%`],
    });
    return res?.rows ?? [];
  }

  if (nomeAlvo) {
    const res = await getLogsGeral({
      limit: limiteConsulta,
      where: 'where data::text ilike $1',
      params: [`%${nomeAlvo}%`],
    });
    return res?.rows ?? [];
  }

  const res = await getLogsGeral({ limit: limiteConsulta });
  return res?.rows ?? [];
}

export async function gerarMassaBiometria({
  scenarioName = 'massaGerada',
  nomeAlvo = 'leonardo',
  cpfAlvo = null,
  limiteImagens = 6,
  limiteConsulta = 20,
} = {}) {
  const normalizedScenarioPath = sanitizeScenarioPath(scenarioName).join('/');
  const targetDir = prepararPastaDestino(scenarioName);
  const cpfsBloqueados = cpfsBaseBloqueados();
  const cpfFiltro = normalizeCpf(cpfAlvo);
  const nomeFiltro = normalizeText(nomeAlvo);
  const rows = await buscarCandidatos({
    nomeAlvo: nomeFiltro || null,
    cpfAlvo: cpfFiltro,
    limiteConsulta: Number.isFinite(Number(limiteConsulta)) ? Number(limiteConsulta) : 20,
  });

  const candidates = rows
    .map((row) => toMassCandidate(row))
    .filter((c) => c.images.length >= limiteImagens)
    .filter((c) => (nomeFiltro ? normalizeText(c.name).includes(nomeFiltro) : true))
    .filter((c) => (cpfFiltro ? c.cpf === cpfFiltro : true))
    .filter((c) => c.cpf && !cpfsBloqueados.has(c.cpf));

  if (!candidates.length) {
    throw new Error('GerarMassa: nenhum candidato válido em logs_general com CPF fora da base.');
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      await salvarSeisImagens(candidate.images, targetDir, limiteImagens);
      return {
        scenarioName: normalizedScenarioPath,
        cpfSelecionado: candidate.cpf,
        nomeSelecionado: candidate.name,
        hashOrigem: candidate.hash,
        kycUrlOrigem: candidate.kycUrl,
        rowIdOrigem: candidate.rowId,
        targetDir,
        files: Array.from(
          { length: limiteImagens },
          (_, idx) => path.join(targetDir, `CENTER_${idx + 1}.png`)
        ),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `GerarMassa: falha ao baixar imagens dos candidatos elegíveis. Último erro: ${lastError?.message ?? 'desconhecido'}`
  );
}

function normalizeStatusAlvo(status) {
  return String(status ?? '')
    .toLowerCase()
    .trim();
}

/**
 * WHERE seguro com parâmetros: status em session_status e opcionalmente texto em data (hash, trecho de JSON, etc.).
 */
function montarWhereLogsPorStatusEReferencia(statusNormalizado, referenciaBanco) {
  const statusExpr = `(
    lower(coalesce(data->'session_status'->>'status', data->'data'->'session_status'->>'status')) = lower($1)
  )`;
  if (referenciaBanco == null || String(referenciaBanco).trim() === '') {
    return { where: `where ${statusExpr}`, params: [statusNormalizado] };
  }
  return {
    where: `where ${statusExpr} and data::text ilike $2`,
    params: [statusNormalizado, `%${String(referenciaBanco).trim()}%`],
  };
}

/**
 * Vários casos (CPFs distintos) a partir de logs_general: pasta massaGerada/<tarefa>/CT00N_<status>/ + CENTER_1..6.
 * Pagina com id menor que o último id da página anterior (cursor); respeita DB_SAFE_SELECT_MAX por SELECT.
 */
export async function gerarMassasParaTarefa({
  nomeTarefa,
  statusAlvo,
  quantidade = 1,
  referenciaBanco = null,
  nomeAlvo = null,
  limiteImagens = 6,
  limiteConsulta = 20,
  raizPastas = 'massaGerada',
  maxPaginas = 40,
} = {}) {
  if (nomeTarefa == null || String(nomeTarefa).trim() === '') {
    throw new Error('GerarMassa: informe nomeTarefa (vira pasta sob massaGerada/).');
  }
  const taskSafe = sanitizeScenarioName(nomeTarefa);
  const statusN = normalizeStatusAlvo(statusAlvo);
  if (!statusN) {
    throw new Error('GerarMassa: informe statusAlvo (ex.: approved, rejected, analysis).');
  }
  if (!Number.isFinite(Number(quantidade)) || Number(quantidade) < 1) {
    throw new Error('GerarMassa: quantidade deve ser um inteiro >= 1.');
  }
  const q = Math.min(100, Math.floor(Number(quantidade)));

  const { where, params } = montarWhereLogsPorStatusEReferencia(statusN, referenciaBanco);
  const cpfsBloqueados = cpfsBaseBloqueados();
  const usados = new Set();
  const nomeFiltro = nomeAlvo ? normalizeText(nomeAlvo) : null;
  const lim = Number.isFinite(Number(limiteConsulta)) ? Number(limiteConsulta) : 20;

  const casos = [];
  let cursorId = null;

  for (let pagina = 0; pagina < maxPaginas && casos.length < q; pagina += 1) {
    const res = await getLogsGeral({
      limit: lim,
      where,
      params,
      idLt: cursorId,
    });
    const rows = res?.rows ?? [];
    if (!rows.length) break;

    for (const row of rows) {
      if (casos.length >= q) break;
      const c = toMassCandidate(row);
      if (c.sessionStatus !== statusN) continue;
      if (c.images.length < limiteImagens) continue;
      if (!c.cpf || cpfsBloqueados.has(c.cpf)) continue;
      if (usados.has(c.cpf)) continue;
      if (nomeFiltro && !normalizeText(c.name).includes(nomeFiltro)) continue;

      const idx = casos.length + 1;
      const scenarioSeg = `CT${String(idx).padStart(3, '0')}_${statusN}`;
      const scenarioName = `${raizPastas}/${taskSafe}/${scenarioSeg}`;
      const targetDir = prepararPastaDestino(scenarioName);

      try {
        await salvarSeisImagens(c.images, targetDir, limiteImagens);
        usados.add(c.cpf);
        casos.push({
          indice: idx,
          scenarioName: sanitizeScenarioPath(scenarioName).join('/'),
          status: statusN,
          cpfSelecionado: c.cpf,
          nomeSelecionado: c.name,
          hashOrigem: c.hash,
          kycUrlOrigem: c.kycUrl,
          rowIdOrigem: c.rowId,
          targetDir,
          files: Array.from({ length: limiteImagens }, (_, i) =>
            path.join(targetDir, `CENTER_${i + 1}.png`)
          ),
        });
      } catch {
        /* tenta próximo candidato */
      }
    }

    cursorId = rows[rows.length - 1]?.id ?? null;
  }

  if (casos.length < q) {
    throw new Error(
      `GerarMassa: obtidos ${casos.length}/${q} caso(s) com status="${statusN}" (tarefa="${taskSafe}"). ` +
        'Revise logs, use referenciaBanco (hash), nomeAlvo, aumente maxPaginas ou confira se há CPFs fora da base.'
    );
  }

  return {
    nomeTarefa: taskSafe,
    statusAlvo: statusN,
    quantidadeSolicitada: q,
    casos,
  };
}
