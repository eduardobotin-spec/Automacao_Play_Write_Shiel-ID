import pkg from 'pg';
import process from 'process';
import { clampDbSelectLimit } from './dbSelectLimits.js';
import { assertProductionReadConnectionAllowed } from './dbProductionGate.js';

const { Client } = pkg;

const TABLE = 'logs_general';

function getDbConfig() {
  return {
    host: process.env.DB_HOST || '54.232.0.137',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'read_only_user',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'shielid',
  };
}

function buildWhereClause(where) {
  if (where == null) return '';
  const w = String(where).trim();
  if (!w) return '';
  return /^where\s/i.test(w) ? ` ${w}` : ` where ${w}`;
}

async function withClient(fn) {
  const cfg = getDbConfig();
  assertProductionReadConnectionAllowed(cfg.host);
  const client = new Client(cfg);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function getLogsGeral({ limit, where = null, params = [], idLt = null } = {}) {
  const lim = clampDbSelectLimit(limit);
  const baseParams = Array.isArray(params) ? [...params] : [];
  let whereSql = buildWhereClause(where);
  const idNum =
    idLt != null && Number.isFinite(Number(idLt)) ? Math.floor(Number(idLt)) : null;

  if (idNum != null) {
    const p = baseParams.length + 1;
    const fragment = `id < $${p}`;
    if (!whereSql) whereSql = ` where ${fragment}`;
    else whereSql += ` and ${fragment}`;
    baseParams.push(idNum);
  }

  const sql = `select * from ${TABLE}${whereSql} order by id desc limit ${lim}`;

  return withClient(async (client) => {
    const res = await client.query(sql, baseParams);
    return {
      rows: res.rows,
      rowCount: res.rowCount,
      columns: res.fields ? res.fields.map((f) => f.name) : [],
    };
  });
}

export async function countLogsGeral({ where = null, params = [] } = {}) {
  const whereSql = buildWhereClause(where);
  const sql = `select count(*)::bigint as total from ${TABLE}${whereSql}`;

  return withClient(async (client) => {
    const res = await client.query(sql, params);
    return Number(res.rows?.[0]?.total ?? 0);
  });
}

export async function describeLogsGeral() {
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
