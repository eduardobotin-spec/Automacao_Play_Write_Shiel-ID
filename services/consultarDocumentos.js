import pkg from 'pg';
import process from 'process';
import { clampDbSelectLimit } from './dbSelectLimits.js';
import { assertProductionReadConnectionAllowed } from './dbProductionGate.js';

const { Client } = pkg;

const TABLE = 'document_consults';

function getDbConfigDocuments() {
  return {
    host: process.env.DB_DOCUMENTS_HOST || process.env.DB_HOST || '54.232.0.137',
    port: process.env.DB_DOCUMENTS_PORT
      ? Number(process.env.DB_DOCUMENTS_PORT)
      : process.env.DB_PORT
      ? Number(process.env.DB_PORT)
      : 5432,
    user: process.env.DB_DOCUMENTS_USER || process.env.DB_USER || 'read_only_user',
    password: process.env.DB_DOCUMENTS_PASS || process.env.DB_PASS || 'password',
    database: process.env.DB_DOCUMENTS_NAME || 'database',
  };
}

function buildWhereClause(where) {
  if (where == null) return '';
  const w = String(where).trim();
  if (!w) return '';
  return /^where\s/i.test(w) ? ` ${w}` : ` where ${w}`;
}

async function withClient(fn) {
  const cfg = getDbConfigDocuments();
  assertProductionReadConnectionAllowed(cfg.host);
  const client = new Client(cfg);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function getDocumentConsults({ limit, where = null, params = [] } = {}) {
  const lim = clampDbSelectLimit(limit);
  const whereSql = buildWhereClause(where);
  const sql = `select * from ${TABLE}${whereSql} order by id desc limit ${lim}`;

  return withClient(async (client) => {
    const res = await client.query(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount,
      columns: res.fields ? res.fields.map((f) => f.name) : [],
    };
  });
}

export async function countDocumentConsults({ where = null, params = [] } = {}) {
  const whereSql = buildWhereClause(where);
  const sql = `select count(*)::bigint as total from ${TABLE}${whereSql}`;

  return withClient(async (client) => {
    const res = await client.query(sql, params);
    return Number(res.rows?.[0]?.total ?? 0);
  });
}

export async function describeDocumentConsults() {
  const sql = `
    select column_name, data_type, is_nullable, character_maximum_length
    from information_schema.columns
    where table_name = $1
    order by ordinal_position asc
    limit 20
  `;

  return withClient(async (client) => {
    const res = await client.query(sql, [TABLE]);
    return res.rows;
  });
}

export function getDocumentConsultsRuntimeMeta() {
  const cfg = getDbConfigDocuments();
  return {
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    table: TABLE,
  };
}
