/**
 * Inventário read-only em staging: amostra paginada de logs_general com security_gate / status_message.
 *
 * Uso:
 *   node scripts/inventariarCasosSecurityGate.mjs
 *   node scripts/inventariarCasosSecurityGate.mjs --paginas 15
 *   node scripts/inventariarCasosSecurityGate.mjs --tudo 1
 *
 * Env (.env): DB_* de staging. Opcional LOGS_GENERAL_JSON_COLUMN=hash_json se a coluna não for `data`.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { inventariarCasosFaceStaging } from '../services/inventariarLogsFaceStaging.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function argInt(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const n = parseInt(process.argv[i + 1], 10);
  return Number.isFinite(n) ? n : fallback;
}

const paginas = argInt('--paginas', 10);
const tudo = process.argv.includes('--tudo');

const resultado = await inventariarCasosFaceStaging({
  paginasMax: Math.min(50, Math.max(1, paginas)),
  somenteComSecurityGate: !tudo,
});

console.log(JSON.stringify(resultado, null, 2));
