import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { gerarMassasParaTarefa } from '../GerarMassa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function argVal(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

const nomeTarefa = argVal('--task');
const statusAlvo = argVal('--status');
const quantidade = Number(argVal('--n', '1'));
const referenciaBanco = argVal('--ref', null);
const nomeAlvo = argVal('--nome', null);
const maxPaginas = Number(argVal('--maxPaginas', '40'));

if (!nomeTarefa || !statusAlvo) {
  console.error(
    'Uso: node scripts/gerarMassasTarefa.mjs --task NOME_TAREFA --status approved|rejected|analysis|... [--n 5] [--ref hash_ou_trecho] [--nome leonardo] [--maxPaginas 40]'
  );
  process.exit(1);
}

const out = await gerarMassasParaTarefa({
  nomeTarefa,
  statusAlvo,
  quantidade,
  referenciaBanco,
  nomeAlvo,
  maxPaginas: Number.isFinite(maxPaginas) ? maxPaginas : 40,
});

console.log(JSON.stringify(out, null, 2));
