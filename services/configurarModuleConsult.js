import pkg from 'pg';
import process from 'process';
import { assertProductionWriteBlocked } from './dbProductionGate.js';

const { Client } = pkg;

const DEFAULT_USER_ID = 'D7n4g9InxXWV52UE';
const USERS_CONFIGS_TABLE = process.env.USERS_CONFIGS_TABLE || 'public.users_configs';
const FULL_MODULES = [
  'telefone',
  'endereco',
  'email',
  'dados_cadastrais',
  'beneficios_governo',
  'pep_listas',
  'impedidos_apostar',
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

function parseConsultType(consultType) {
  const parts = String(consultType ?? '')
    .split('+')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return Array.from(new Set(parts));
}

function isFullConfig(modules) {
  if (modules.length !== FULL_MODULES.length) return false;
  const set = new Set(modules);
  return FULL_MODULES.every((m) => set.has(m));
}

function moduleConsultFromConsultType(consultType) {
  const modules = parseConsultType(consultType);
  if (modules.length === 0) {
    throw new Error('configurarModuleConsult: consultType vazio.');
  }
  if (isFullConfig(modules)) return ['full'];
  return modules;
}

async function getModuleConsultColumnMeta(client) {
  const { schema, table } = parseQualifiedTableName(USERS_CONFIGS_TABLE);
  const sql = `
    select data_type, udt_name
    from information_schema.columns
    where table_schema = $1
      and table_name = $2
      and column_name = 'module_consult'
    limit 1
  `;
  const res = await client.query(sql, [schema, table]);
  return res.rows?.[0] ?? null;
}

function parseQualifiedTableName(qualifiedName) {
  const raw = String(qualifiedName ?? '').trim();
  const match = raw.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (!match) {
    throw new Error(
      `configurarModuleConsult: USERS_CONFIGS_TABLE inválida (${raw}). Use formato schema.tabela.`
    );
  }
  return { schema: match[1], table: match[2], qualified: `${match[1]}.${match[2]}` };
}

async function assertUsersConfigsExists(client, tableQualified) {
  const res = await client.query('select to_regclass($1) as regclass', [tableQualified]);
  if (!res.rows?.[0]?.regclass) {
    throw new Error(
      `configurarModuleConsult: tabela não encontrada (${tableQualified}). Verifique DB_NAME/USERS_CONFIGS_TABLE.`
    );
  }
}

export async function configurarModuleConsultPorConsultType({
  consultType,
  userId = process.env.TENANT_ID || DEFAULT_USER_ID,
} = {}) {
  const moduleConsult = moduleConsultFromConsultType(consultType);
  const tableInfo = parseQualifiedTableName(USERS_CONFIGS_TABLE);
  const cfg = getDbConfig();
  assertProductionWriteBlocked(cfg.host);
  const client = new Client(cfg);

  await client.connect();
  try {
    await assertUsersConfigsExists(client, tableInfo.qualified);
    const columnMeta = await getModuleConsultColumnMeta(client);
    const dataType = String(columnMeta?.data_type ?? '').toLowerCase();
    const udtName = String(columnMeta?.udt_name ?? '').toLowerCase();

    let query = `
      UPDATE ${tableInfo.qualified}
      SET module_consult = $1
      WHERE user_id = $2
      RETURNING user_id, module_consult
    `;
    let params = [JSON.stringify(moduleConsult), String(userId)];

    // Compatibilidade com diferentes tipos de coluna no banco.
    if (dataType === 'jsonb') {
      query = `
        UPDATE ${tableInfo.qualified}
        SET module_consult = $1::jsonb
        WHERE user_id = $2
        RETURNING user_id, module_consult
      `;
    } else if (dataType === 'json') {
      query = `
        UPDATE ${tableInfo.qualified}
        SET module_consult = $1::json
        WHERE user_id = $2
        RETURNING user_id, module_consult
      `;
    } else if (udtName.endsWith('[]')) {
      query = `
        UPDATE ${tableInfo.qualified}
        SET module_consult = $1
        WHERE user_id = $2
        RETURNING user_id, module_consult
      `;
      params = [moduleConsult, String(userId)];
    }

    const result = await client.query(query, params);

    if ((result.rowCount ?? 0) === 0) {
      throw new Error(`configurarModuleConsult: user_id não encontrado: ${userId}`);
    }

    return {
      user_id: result.rows[0].user_id,
      module_consult: result.rows[0].module_consult,
    };
  } finally {
    await client.end();
  }
}

