/**
 * Staging: últimos 50 de hash_json.payload (coluna json), lista sem repetir o mesmo rejection_message.
 *
 *   node scripts/listarHashJsonMotivos.mjs
 *   node scripts/listarHashJsonMotivos.mjs --total 50
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getUltimosHashJson,
  parseHashJsonRow,
} from '../services/consultarHashJson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function argInt(name, def) {
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  const n = parseInt(process.argv[i + 1], 10);
  return Number.isFinite(n) ? n : def;
}

const total = Math.min(200, Math.max(1, argInt('--total', 50)));

const linhas = await getUltimosHashJson({ totalAlvo: total });

const vistos = new Set();
const unicosComMotivo = [];
const semMotivoIds = [];

for (const row of linhas) {
  const p = parseHashJsonRow(row);
  const msg = p.rejection_message;
  if (!msg) {
    if (semMotivoIds.length < 10) semMotivoIds.push(p.row_id);
    continue;
  }
  const chave = msg.toLowerCase();
  if (vistos.has(chave)) continue;
  vistos.add(chave);
  unicosComMotivo.push({ row_id: p.row_id, rejection_message: msg });
}

const saida = {
  meta: {
    tabela: process.env.HASH_JSON_TABLE || 'hash_json',
    coluna_json: process.env.HASH_JSON_JSON_COLUMN || 'json',
    registros_lidos: linhas.length,
    total_solicitado: total,
    motivos_unicos: unicosComMotivo.length,
    exemplos_row_id_sem_rejection_message: semMotivoIds,
  },
  motivos_sem_repetir: unicosComMotivo,
};

console.log(JSON.stringify(saida, null, 2));
