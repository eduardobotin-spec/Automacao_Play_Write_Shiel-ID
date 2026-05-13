import pkg from 'pg';
import process from 'process';
import { assertProductionWriteBlocked } from './dbProductionGate.js';

const { Client } = pkg;

const DB_CONFIG = {
  host: process.env.DB_HOST || '54.232.0.137',
  port: 5432,
  user: process.env.DB_USER || 'read_only_user',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'database',
};

// 🔹 função principal
export async function limparBanco() {
  assertProductionWriteBlocked(DB_CONFIG.host);
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();

    const query = `
      DELETE FROM users_kyc
      WHERE database = 'testes-automatiz';
    `;

    const result = await client.query(query);

    console.log(`Registros removidos: ${result.rowCount}`);

    return result.rowCount;

  } catch (error) {
    console.error('Erro ao limpar banco:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}