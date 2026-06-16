const { Client } = require('pg');

const DB_DOCUMENTS = {
  host: process.env.DB_HOST || '54.232.0.137',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'read_only_user',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_DOCUMENTS_NAME || 'database',
};

const DB_SHIELID = {
  host: process.env.DB_HOST || '54.232.0.137',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'read_only_user',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'shielid',
};

const USERS_KYC_DATABASE = process.env.USERS_KYC_DATABASE || 'testes-automatiz';

const CPFS_CA = [
  '23134061805', '13186368685', '14749091910', '96477776472',
  '02819176470', '87960575134', '77593626253', '22024494773',
  '10589331914', '48758837817',
];

const CPFS_EQ = [
  '50231188862',
];

const CPFS_GATE_MASSA = [
  '03853243088', '04319904257', '04714039547',
  '05542615708', '05883287077', '05972738988',
  '06844623542', '07114855001', '07328769580',
  '07586429464', '07821511323', '08281430567',
  '08763855445', '11041049625', '11406446530',
  '20511748736', '36437831839', '41490542825',
];

const CPFS_GATE_SPOOFING = [
  '12462644717', '14621256629', '09244209284',
  '13288699702', '04288225680', '08289203977',
  '16210793924', '05472994357', '06015754583',
  '33228165833',
];

const ALL_CPFS = [...new Set([
  ...CPFS_CA,
  ...CPFS_EQ,
  ...CPFS_GATE_MASSA,
  ...CPFS_GATE_SPOOFING,
])];

function parseArgs() {
  const args = process.argv.slice(2);
  let cpfOnly = null;
  let dryRun = false;
  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--cpf=')) {
      const v = arg.replace('--cpf=', '').replace(/\D/g, '');
      if (v.length === 11) cpfOnly = v;
    }
  }
  return { cpfOnly, dryRun };
}

async function main() {
  const { cpfOnly, dryRun } = parseArgs();
  const cpfs = cpfOnly ? [cpfOnly] : ALL_CPFS;

  console.log(`=== Limpar Base de Dados ===`);
  console.log(`Modo: ${dryRun ? 'DRY-RUN (nenhuma alteração)' : 'EXECUÇÃO'}`);
  console.log(`CPFs: ${cpfs.length} (${cpfOnly ? `apenas ${cpfOnly}` : 'todos os cenários'})`);
  if (!dryRun) {
    console.log('');
  }

  const docClient = new Client(DB_DOCUMENTS);
  const shielidClient = new Client(DB_SHIELID);

  try {
    await docClient.connect();
    await shielidClient.connect();

    if (dryRun) {
      for (const cpf of cpfs) {
        const r1 = await docClient.query(
          `SELECT COUNT(*) AS total FROM document_consults WHERE document = $1`, [cpf]
        );
        const r2 = await docClient.query(
          `SELECT COUNT(*) AS total FROM users_kyc WHERE "database" = $1 AND document = $2`,
          [USERS_KYC_DATABASE, cpf]
        );
        const r3 = await shielidClient.query(
          `SELECT COUNT(*) AS total FROM logs_general WHERE data::text ILIKE $1`,
          [`%${cpf}%`]
        );
        console.log(`  ${cpf}: document_consults=${r1.rows[0].total}, users_kyc=${r2.rows[0].total}, logs_general=${r3.rows[0].total}`);
      }
      console.log('\nDRY-RUN concluído. Nenhum registro foi removido.');
      return;
    }

    let totalDoc = 0, totalKyc = 0, totalLogs = 0;

    for (const cpf of cpfs) {
      const delDoc = await docClient.query(
        'DELETE FROM document_consults WHERE document = $1', [cpf]
      );
      const delKyc = await docClient.query(
        'DELETE FROM users_kyc WHERE "database" = $1 AND document = $2',
        [USERS_KYC_DATABASE, cpf]
      );
      const delLogs = await shielidClient.query(
        'DELETE FROM logs_general WHERE data::text ILIKE $1',
        [`%${cpf}%`]
      );
      const nDoc = delDoc.rowCount ?? 0;
      const nKyc = delKyc.rowCount ?? 0;
      const nLogs = delLogs.rowCount ?? 0;
      totalDoc += nDoc;
      totalKyc += nKyc;
      totalLogs += nLogs;
      if (nDoc > 0 || nKyc > 0 || nLogs > 0) {
        console.log(`  ${cpf}: document_consults=${nDoc}, users_kyc=${nKyc}, logs_general=${nLogs}`);
      }
    }

    console.log(`\nTotal removido: document_consults=${totalDoc}, users_kyc=${totalKyc}, logs_general=${totalLogs}`);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    await docClient.end().catch(() => {});
    await shielidClient.end().catch(() => {});
  }
}

main();
