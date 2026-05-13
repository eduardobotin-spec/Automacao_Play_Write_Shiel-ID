/**
 * Consolidado: rejection_message nos últimos N registros de hash_json (database documentos).
 *   npm run hashjson:rejection-freq
 *   node scripts/consolidarRejectionMessages.mjs --limite 50
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryRejectionMessageFrequencias } from '../services/consultarHashJson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function argInt(name, def) {
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  const n = parseInt(process.argv[i + 1], 10);
  return Number.isFinite(n) ? n : def;
}

const limite = argInt('--limite', 50);

const { lista, sqlParaExibicao, limiteRegistros } = await queryRejectionMessageFrequencias({
  limiteRegistros: limite,
});

const out = {
  limite_registros_fonte: limiteRegistros,
  resultado: lista,
  query_sql_exibicao: sqlParaExibicao,
};

console.log(JSON.stringify(out, null, 2));
