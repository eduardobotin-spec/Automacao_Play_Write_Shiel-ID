import fs from 'fs';
import path from 'path';
import process from 'process';
import pg from 'pg';

const { Client } = pg;

const SHIELID_DB = {
  host: process.env.DB_HOST || '54.232.0.137',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER || 'read_only_user',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'shielid',
};

const DOCUMENTS_DB = {
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

const ROW_LIMIT = Number(process.env.CONSULTAS_LOG_LIMIT || 200);

function stampLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
    d.getMinutes()
  )}-${pad(d.getSeconds())}`;
}

function toPrintable(value) {
  if (value == null) return 'null';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function formatTable({ tableName, rows }) {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const widths = columns.map((col) => col.length);

  for (const row of rows) {
    columns.forEach((col, idx) => {
      const val = toPrintable(row[col]);
      if (val.length > widths[idx]) widths[idx] = val.length;
    });
  }

  const renderLine = (char = '-') => widths.map((w) => char.repeat(w)).join('-+-');
  const renderRow = (row) =>
    columns
      .map((col, idx) => {
        const val = row == null ? col : toPrintable(row[col]);
        return val.padEnd(widths[idx], ' ');
      })
      .join(' | ');

  const block = [];
  block.push(`TABLE: ${tableName}`);
  block.push(`ROWS: ${rows.length}`);
  if (!columns.length) {
    block.push('(sem registros)');
    block.push('');
    return block.join('\n');
  }

  block.push(renderLine('-'));
  block.push(renderRow(null));
  block.push(renderLine('='));
  for (const row of rows) {
    block.push(renderRow(row));
  }
  block.push(renderLine('-'));
  block.push('');
  return block.join('\n');
}

async function queryRows(dbConfig, sql, tableName) {
  const client = new Client(dbConfig);
  await client.connect();
  try {
    const res = await client.query(sql);
    return formatTable({ tableName, rows: res.rows });
  } finally {
    await client.end();
  }
}

async function run() {
  const logsDir = path.join(process.cwd(), 'logs');
  fs.mkdirSync(logsDir, { recursive: true });

  const sections = [];
  sections.push(`# EXTRAÇÃO DE CONSULTAS (${new Date().toISOString()})`);
  sections.push(`# LIMIT por tabela: ${ROW_LIMIT}`);
  sections.push('');

  sections.push(
    await queryRows(SHIELID_DB, 'select * from services order by id asc', 'shielid.services')
  );
  sections.push(
    await queryRows(
      SHIELID_DB,
      `select * from invoices_itens order by id desc limit ${ROW_LIMIT}`,
      'shielid.invoices_itens'
    )
  );
  sections.push(
    await queryRows(
      SHIELID_DB,
      `select * from logs_general order by id desc limit ${ROW_LIMIT}`,
      'shielid.logs_general'
    )
  );
  sections.push(
    await queryRows(
      DOCUMENTS_DB,
      `select * from document_consults order by id desc limit ${ROW_LIMIT}`,
      'database.document_consults'
    )
  );

  const outputPath = path.join(logsDir, `consultas_db_${stampLocal()}.txt`);
  fs.writeFileSync(outputPath, sections.join('\n'), 'utf8');

  console.log(outputPath);
}

run().catch((error) => {
  console.error('Falha ao extrair consultas do banco:', error.message);
  process.exit(1);
});
