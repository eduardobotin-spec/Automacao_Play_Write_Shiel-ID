import pkg from 'pg';
import process from 'process';
import { assertProductionWriteBlocked } from './dbProductionGate.js';

const { Client } = pkg;

function getDbConfigDatabase() {
  return {
    host: process.env.DB_HOST || '54.232.0.137',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'read_only_user',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_DOCUMENTS_NAME || 'database',
  };
}

function getDbConfigShielid() {
  return {
    host: process.env.DB_HOST || '54.232.0.137',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'read_only_user',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'shielid',
  };
}

export async function limparConsultasPorPlaca(placa) {
  const placaNormalized = String(placa ?? '').trim().toUpperCase();
  if (!placaNormalized) {
    throw new Error(`limparConsultasPorPlaca: placa inválida: ${placa}`);
  }
  const usersKycDatabase = String(process.env.USERS_KYC_DATABASE || 'testes-automatiz').trim();

  const documentCfg = getDbConfigDatabase();
  const shielidCfg = getDbConfigShielid();
  assertProductionWriteBlocked(documentCfg.host);
  assertProductionWriteBlocked(shielidCfg.host);

  const documentClient = new Client(documentCfg);
  const logsClient = new Client(shielidCfg);

  await documentClient.connect();
  await logsClient.connect();
  try {
    const delDocumentConsults = await documentClient.query(
      'delete from document_consults where document = $1',
      [placaNormalized]
    );

    const delLogsGeneral = await logsClient.query(
      'delete from logs_general where data::text ilike $1',
      [`%${placaNormalized}%`]
    );

    const delUsersKyc = await documentClient.query(
      'delete from users_kyc where "database" = $1 and document = $2',
      [usersKycDatabase, placaNormalized]
    );

    return {
      placa: placaNormalized,
      document_consults_deleted: delDocumentConsults.rowCount ?? 0,
      logs_general_deleted: delLogsGeneral.rowCount ?? 0,
      users_kyc_deleted: delUsersKyc.rowCount ?? 0,
    };
  } finally {
    await documentClient.end();
    await logsClient.end();
  }
}
