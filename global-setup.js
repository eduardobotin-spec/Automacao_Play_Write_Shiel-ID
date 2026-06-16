/**
 * global-setup.js
 *
 * Executado UMA VEZ antes de todos os testes (via globalSetup no playwright.config.js).
 * Limpa os registros de teste do banco para garantir estado inicial limpo.
 *
 * Antes: cada spec chamava limparBanco() no beforeAll, gerando N conexoes ao banco.
 * Agora: conexao unica, startup rapido.
 */

import { limparBanco } from './services/limparBanco.js';

export default async function globalSetup() {
  console.log('\n[global-setup] Limpando banco antes dos testes...');
  try {
    const removidos = await limparBanco();
    console.log(`[global-setup] OK — ${removidos} registro(s) removido(s).\n`);
  } catch (err) {
    // Nao bloqueia os testes se o banco estiver inacessivel em ambiente sem DB.
    console.warn(`[global-setup] Aviso: limparBanco falhou — ${err.message}`);
    console.warn('[global-setup] Testes continuarao sem limpeza previa.\n');
  }
}
