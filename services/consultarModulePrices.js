import pkg from 'pg';
import process from 'process';
import { clampDbSelectLimit } from './dbSelectLimits.js';
import { assertProductionReadConnectionAllowed, assertProductionWriteBlocked } from './dbProductionGate.js';

const { Client } = pkg;
const PRICE_FIELDS = [
  'full_price',
  'phone_price',
  'address_price',
  'email_price',
  'registration_data_price',
  'gov_benefits_price',
  'pep_list_price',
  'betting_ban_price',
  'financial_data_price',
  'online_betting_price',
];

function getDbConfig() {
  return {
    host: process.env.DB_HOST || '54.232.0.137',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'read_only_user',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'shielid',
  };
}

async function withClient(fn, mode = 'read') {
  const cfg = getDbConfig();
  if (mode === 'write') {
    assertProductionWriteBlocked(cfg.host);
  } else {
    assertProductionReadConnectionAllowed(cfg.host);
  }
  const client = new Client(cfg);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function getActiveModulePrices() {
  const sql = `
    select *
    from module_prices
    where is_active = true
    order by provider asc
    limit ${clampDbSelectLimit()}
  `;

  return withClient(async (client) => {
    const res = await client.query(sql);
    return res.rows;
  });
}

function toNumericOrNull(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeProviderUpdates(providerUpdates = {}) {
  const providers = ['netrin', 'bigdata'];
  const normalized = {};
  for (const provider of providers) {
    const source = providerUpdates?.[provider] ?? {};
    const out = {};
    for (const field of PRICE_FIELDS) {
      if (field in source) out[field] = toNumericOrNull(source[field]);
    }
    normalized[provider] = out;
  }
  return normalized;
}

export async function updateModulePricesByProvider(providerUpdates = {}) {
  const normalized = normalizeProviderUpdates(providerUpdates);
  return withClient(async (client) => {
    await client.query('begin');
    try {
      for (const provider of ['netrin', 'bigdata']) {
        const fields = Object.keys(normalized[provider]);
        if (!fields.length) continue;
        const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
        const params = [...fields.map((field) => normalized[provider][field]), provider];
        await client.query(
          `update module_prices
           set ${setClause}, updated_at = now()
           where provider = $${fields.length + 1}`,
          params
        );
      }
      const res = await client.query(
        `select *
         from module_prices
         where provider in ('netrin', 'bigdata')
         order by provider asc
         limit ${clampDbSelectLimit()}`
      );
      await client.query('commit');
      return res.rows;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }, 'write');
}

