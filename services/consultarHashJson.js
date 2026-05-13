import pkg from 'pg';
import process from 'process';
import { clampDbSelectLimit } from './dbSelectLimits.js';
import { assertProductionReadConnectionAllowed } from './dbProductionGate.js';

const { Client } = pkg;

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function safeIdent(name, fallback) {
  const n = String(name ?? '').trim();
  if (IDENT.test(n)) return n;
  return fallback;
}

/**
 * Aspas duplas se HASH_JSON_QUOTE_IDENTIFIERS=yes ou se houver maiúsculas (ex.: tabela "HASH_JSON").
 */
function pgIdent(name) {
  const n = String(name ?? '').trim();
  if (!IDENT.test(n)) {
    throw new Error(`consultarHashJson: identificador SQL inválido (${name}).`);
  }
  const quote =
    process.env.HASH_JSON_QUOTE_IDENTIFIERS === 'yes' || /[A-Z]/.test(n);
  return quote ? `"${n}"` : n;
}

function getDbConfigHashJson() {
  return {
    host: process.env.HASH_JSON_HOST || process.env.DB_DOCUMENTS_HOST || process.env.DB_HOST || '54.232.0.137',
    port: process.env.HASH_JSON_PORT
      ? Number(process.env.HASH_JSON_PORT)
      : process.env.DB_DOCUMENTS_PORT
        ? Number(process.env.DB_DOCUMENTS_PORT)
        : process.env.DB_PORT
          ? Number(process.env.DB_PORT)
          : 5432,
    user: process.env.HASH_JSON_USER || process.env.DB_DOCUMENTS_USER || process.env.DB_USER || 'read_only_user',
    password: process.env.HASH_JSON_PASS || process.env.DB_DOCUMENTS_PASS || process.env.DB_PASS || 'password',
    database:
      process.env.HASH_JSON_DATABASE || process.env.DB_DOCUMENTS_NAME || process.env.DB_NAME || 'database',
  };
}

const DEFAULT_TABLE = 'hash_json';
const DEFAULT_ID_COLUMN = 'id';
/** Coluna JSON no PostgreSQL: `json` é palavra reservada — usar identificador entre aspas. */
const DEFAULT_JSON_COLUMN = 'json';

function qualifiedTableFromEnv() {
  const raw = String(process.env.HASH_JSON_TABLE || DEFAULT_TABLE).trim();
  const parts = raw.split('.').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) return pgIdent(parts[0]);
  if (parts.length === 2) {
    return `${pgIdent(parts[0])}.${pgIdent(parts[1])}`;
  }
  throw new Error(`consultarHashJson: HASH_JSON_TABLE inválida (${raw}). Use tabela ou schema.tabela.`);
}

function idColumn() {
  return pgIdent(safeIdent(process.env.HASH_JSON_ID_COLUMN, DEFAULT_ID_COLUMN));
}

function jsonColumnQuoted() {
  const c = String(process.env.HASH_JSON_JSON_COLUMN || DEFAULT_JSON_COLUMN).trim();
  if (!IDENT.test(c)) {
    throw new Error(`consultarHashJson: HASH_JSON_JSON_COLUMN inválida (${c}).`);
  }
  return `"${c}"`;
}

async function withClient(fn) {
  const cfg = getDbConfigHashJson();
  assertProductionReadConnectionAllowed(cfg.host);
  const client = new Client(cfg);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * Últimos N registros da tabela hash_json (por `id` desc), respeitando teto por SELECT (paginação automática).
 */
export async function getUltimosHashJson({ totalAlvo = 50 } = {}) {
  const cap = Math.min(Math.max(1, Math.floor(Number(totalAlvo) || 50)), 200);
  const table = qualifiedTableFromEnv();
  const idCol = idColumn();
  const jsonCol = jsonColumnQuoted();

  const acumulado = [];
  let idLt = null;

  while (acumulado.length < cap) {
    const falta = cap - acumulado.length;
    const lim = clampDbSelectLimit(falta);
    let sql;
    let params;
    if (idLt == null) {
      sql = `select ${idCol} as row_id, ${jsonCol} as payload from ${table} order by ${idCol} desc limit ${lim}`;
      params = [];
    } else {
      sql = `select ${idCol} as row_id, ${jsonCol} as payload from ${table} where ${idCol} < $1 order by ${idCol} desc limit ${lim}`;
      params = [Math.floor(Number(idLt))];
    }

    const res = await withClient((client) => client.query(sql, params));
    const rows = res.rows ?? [];
    if (!rows.length) break;
    acumulado.push(...rows);
    idLt = rows[rows.length - 1]?.row_id;
  }

  return acumulado.slice(0, cap);
}

function parsePayload(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Caminhos usuais do payload (API / face / security_gate).
 */
export function extrairRejectionMessageDoPayload(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const tryStr = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  };
  let m = tryStr(obj.rejection_message);
  if (m) return m;
  m = tryStr(obj.face?.rejection_message);
  if (m) return m;
  m = tryStr(obj.face?.security_gate?.rejection_message);
  if (m) return m;
  m = tryStr(obj.data?.rejection_message);
  if (m) return m;
  m = tryStr(obj.data?.face?.rejection_message);
  if (m) return m;
  m = tryStr(obj.data?.face?.security_gate?.rejection_message);
  if (m) return m;
  return null;
}

export function parseHashJsonRow(row) {
  const payload = parsePayload(row?.payload);
  return {
    row_id: row?.row_id ?? null,
    rejection_message: extrairRejectionMessageDoPayload(payload),
    payload,
  };
}

/**
 * SQL: últimos N registros por id, extrai rejection_message (vários caminhos jsonb), agrupa e ordena por frequência.
 * Uso com parâmetro: LIMIT $1 → passar [n] no client.query.
 */
export function buildSqlRejectionMessageFrequenciasUltimosN(limiteRegistros = 50) {
  const table = qualifiedTableFromEnv();
  const idCol = idColumn();
  const jsonCol = jsonColumnQuoted();
  const n = Math.min(200, Math.max(1, Math.floor(Number(limiteRegistros) || 50)));
  const sql = `
WITH ultimos AS (
  SELECT ${idCol} AS _id, ${jsonCol}::jsonb AS j
  FROM ${table}
  ORDER BY ${idCol} DESC NULLS LAST
  LIMIT $1
),
extraidos AS (
  SELECT
    NULLIF(
      TRIM(
        COALESCE(
          ultimos.j->>'rejection_message',
          ultimos.j->'face'->>'rejection_message',
          ultimos.j->'face'->'security_gate'->>'rejection_message',
          ultimos.j->'data'->>'rejection_message',
          ultimos.j->'data'->'face'->>'rejection_message',
          ultimos.j->'data'->'face'->'security_gate'->>'rejection_message'
        )
      ),
      ''
    ) AS rejection_message
  FROM ultimos
)
SELECT rejection_message, COUNT(*)::int AS quantidade
FROM extraidos
WHERE rejection_message IS NOT NULL
GROUP BY rejection_message
ORDER BY quantidade DESC, rejection_message ASC;
`.trim();
  const sqlParaExibicao = sql.replace(/\$1\b/g, String(n));
  return { sql, params: [n], limiteRegistros: n, sqlParaExibicao };
}

export async function queryRejectionMessageFrequencias({ limiteRegistros = 50 } = {}) {
  const built = buildSqlRejectionMessageFrequenciasUltimosN(limiteRegistros);
  const res = await withClient((client) => client.query(built.sql, built.params));
  const lista = (res.rows ?? []).map((r) => ({
    rejection_message: r.rejection_message,
    quantidade: Number(r.quantidade ?? 0),
  }));
  return {
    lista,
    sql: built.sql,
    sqlParaExibicao: built.sqlParaExibicao,
    limiteRegistros: built.limiteRegistros,
  };
}
