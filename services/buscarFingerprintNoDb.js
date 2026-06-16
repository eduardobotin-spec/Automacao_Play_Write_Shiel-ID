/**
 * ============================================================
 * SERVICE: buscarFingerprintNoDb
 * ============================================================
 * Consulta a tabela hash_jsons no banco de staging e verifica
 * se a coluna json contém a propriedade "devices" com dados
 * de fingerprint para um determinado hash KYC.
 *
 * Usado pelos cenários de fingerprint (Tarefa #318).
 * ============================================================
 */

import pkg from 'pg';
import process from 'process';

const { Client } = pkg;

const DB_CONFIG = {
  host: process.env.DB_HOST || '54.232.0.137',
  port: 5432,
  user: process.env.DB_USER || 'read_only_user',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'database',
};

/**
 * Busca os registros de fingerprint (devices) salvos em hash_jsons para um hash KYC.
 *
 * @param {string} hash - Hash KYC gerado pelo getNewHashKYC
 * @returns {{ found: boolean, devices: any[] }} - found: true se ao menos um device foi salvo
 */
export async function buscarFingerprintNoDb(hash) {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();

    // hash_jsons armazena o JSON da sessão KYC.
    // A propriedade devices dentro da coluna json contém os fingerprints coletados.
    const result = await client.query(
      `SELECT json FROM hash_jsons WHERE id = $1 LIMIT 1`,
      [hash]
    );

    if (result.rowCount === 0) {
      return { found: false, devices: [] };
    }

    const json = result.rows[0].json;
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    const devices = parsed?.devices ?? [];

    return {
      found: Array.isArray(devices) && devices.length > 0,
      devices,
    };

  } catch (error) {
    console.error('buscarFingerprintNoDb: erro ao consultar banco:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Verifica se um visitor_id específico aparece em mais de uma hash KYC no banco.
 * Usado pelo CT004 — mesmo device com CPF diferente.
 *
 * @param {string} visitorId - visitor_id gerado pelo FingerprintJS
 * @returns {{ found: boolean, hashes: string[] }} - hashes onde o visitor_id aparece
 */
export async function buscarVisitorIdEmMultiplasHashes(visitorId) {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();

    const result = await client.query(
      `SELECT id FROM hash_jsons WHERE json::text LIKE $1`,
      [`%${visitorId}%`]
    );

    const hashes = result.rows.map(r => r.id);

    return {
      found: hashes.length > 1,
      hashes,
    };

  } catch (error) {
    console.error('buscarVisitorIdEmMultiplasHashes: erro:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}
