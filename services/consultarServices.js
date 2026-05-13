import pkg from 'pg';
import process from 'process';
import { getDbSafeSelectMax } from './dbSelectLimits.js';
import { assertProductionReadConnectionAllowed } from './dbProductionGate.js';

const { Client } = pkg;

const TABLE = 'services';

function getDbConfig() {
  return {
    host: process.env.DB_HOST || '54.232.0.137',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'read_only_user',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'shielid',
  };
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

export async function getServicesByIds(serviceIds = []) {
  const cap = getDbSafeSelectMax();
  const ids = Array.from(new Set((serviceIds || []).map((v) => Number(v)).filter(Number.isFinite))).slice(
    0,
    cap
  );
  if (!ids.length) {
    return {
      rows: [],
      rowCount: 0,
      columns: [],
    };
  }

  const sql = `select * from ${TABLE} where id = any($1::int[]) order by id asc`;

  return withClient(async (client) => {
    const res = await client.query(sql, [ids]);
    return {
      rows: res.rows,
      rowCount: res.rowCount,
      columns: res.fields ? res.fields.map((f) => f.name) : [],
    };
  });
}

