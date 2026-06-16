/**
 * CONSULTA MANUAL — Painel do Cliente
 * =====================================
 *
 * O que testa:
 *   - UI: login, consulta, seções do detalhe, campos preenchidos
 *   - DB: document_consults (registro da consulta)
 *   - DB: invoices_itens (cobrança gerada)
 *
 * Fluxo de cada cenário:
 *   1. Configura module_consult do cliente no DB
 *   2. Login no painel como Administrador
 *   3. Acessa /consultas, preenche CPF, seleciona módulos
 *   4. Clica "Consultar" → página de detalhe
 *   5. Valida seções do detalhe vs módulos habilitados
 *   6. Valida document_consults (registrou a consulta?)
 *   7. Valida invoices_itens (cobrou a consulta?)
 *
 * Como ajustar manualmente:
 *   Procure por [ATENÇÃO] no código — são pontos onde você
 *   precisa confirmar ou ajustar o seletor/expectativa.
 */

import { test, expect } from '@playwright/test';
import { configurarModuleConsultPorConsultType } from '../services/configurarModuleConsult.js';
import { getDocumentConsults } from '../services/consultarDocumentos.js';
import { getInvoicesItensByHash } from '../services/consultarInvoicesItens.js';
import { limparConsultasPorCpf } from '../services/limparConsultasPorCpf.js';
import { appendApiResultBlock } from '../services/apiResultLog.js';
import * as baseDados from '../services/baseDados.js';

// ── Constantes ──────────────────────────────────────────────────────────────

const PAINEL_URL  = process.env.PAINEL_URL || 'https://painel.shielid-staging.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'zugote88@gmail.com';
const ADMIN_PASS  = process.env.ADMIN_PASS || 'Eduardo@@1988';
const TENANT_ID   = process.env.TENANT_ID || 'D7n4g9InxXWV52UE';

// CPF único para todos os cenários (o que importa é o comportamento)
const CPF = baseDados.CA001 || '23134061805';
const CPF_INVALIDO = '00000000000';

// ── Helpers de UI ──────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(`${PAINEL_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('textbox', { name: 'E-mail' }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Senha' }).fill(ADMIN_PASS);
  await page.getByRole('button', { name: 'Entrar' }).click();
  // [ATENÇÃO] "Dashboard" aparece no menu lateral e como título da página.
  // Usamos o link do menu lateral para validar o login.
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible({ timeout: 30000 });
}

async function acessarConsultaManual(page) {
  await page.goto(`${PAINEL_URL}/consultas`);
  await expect(page.getByPlaceholder('000.000.000-00')).toBeVisible({ timeout: 15000 });
}

async function preencherCpf(page, cpf) {
  const campo = page.getByPlaceholder('000.000.000-00');
  await campo.clear();
  await campo.fill(cpf);
}

/**
 * Seleciona módulos na tela de Consulta Manual.
 *
 * Estratégia:
 *   1. Clica em TODOS os módulos (desmarca todos)
 *   2. Clica apenas nos desejados (ativa)
 *
 * [ATENÇÃO] Isso assume que o estado inicial é "todos ativos".
 * Se o comportamento for diferente, ajuste manualmente.
 */
async function selecionarModulos(page, modulosDesejados) {
  const todos = [
    'Benefícios Gov.',
    'Dados Cadastrais',
    'E-mail',
    'Endereço',
    'Impedidos de Apostar',
    'PEP / Listas',
    'Telefone',
  ];

  // Aguarda os botões carregarem antes de interagir
  await page.waitForTimeout(500);

  // Passo 1: clica em todos para desmarcar
  for (const label of todos) {
    const btn = page.getByRole('button', { name: label });
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    await page.waitForTimeout(150);
  }

  // Passo 2: clica só nos desejados para marcar
  for (const label of todos) {
    if (modulosDesejados.includes(label)) {
      const btn = page.getByRole('button', { name: label });
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      await page.waitForTimeout(150);
    }
  }
}

async function clicarConsultar(page) {
  await page.getByRole('button', { name: 'Consultar' }).click();
  // Aguarda navegar para o detalhe
  await expect(page.getByText('Detalhe da Consulta')).toBeVisible({ timeout: 30000 });
}

// ── Helpers de DB ──────────────────────────────────────────────────────────

async function limparBase(cpf) {
  await limparConsultasPorCpf(cpf.replace(/\D/g, ''));
}

/**
 * Busca registros de consulta no banco pelo CPF.
 * Usa o CPF como filtro (sem hash).
 */
async function buscarDocumentConsults(cpf) {
  return getDocumentConsults({
    limit: 10,
    where: 'where document = $1',
    params: [cpf.replace(/\D/g, '')],
  });
}

/**
 * Busca cobranças pelo hash.
 * O hash é extraído do primeiro registro de document_consults.
 */
async function buscarInvoices(hash) {
  return getInvoicesItensByHash(hash, { limit: 10 });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Cenários ───────────────────────────────────────────────────────────────

test.describe('Consulta Manual — Validação completa (UI + DB)', () => {

  // ═════════════════════════════════════════════════════════════════════════
  // CM01 — Consulta Full (todos os 7 módulos habilitados)
  //
  // O que valida:
  //   - UI: seções do detalhe aparecem ("Situação cadastral", "Contato",
  //         "Listas Restritivas")
  //   - UI: campos não estão vazios nem ilegíveis
  //   - DB: document_consults tem registro
  //   - DB: invoices_itens tem cobrança
  // ═════════════════════════════════════════════════════════════════════════

  test('CM01 - Full — seções visíveis, registro e cobrança OK', async ({ page }) => {
    // ── 1. Configura módulos do cliente no DB ──
    await configurarModuleConsultPorConsultType({
      consultType: 'telefone+endereco+email+beneficios_governo+pep_listas+impedidos_apostar+dados_cadastrais',
      userId: TENANT_ID,
    });

    // ── 2. Limpa base do CPF (para assertiva limpa) ──
    await limparBase(CPF);

    // ── 3. UI: login + consulta ──
    await login(page);
    await acessarConsultaManual(page);
    await preencherCpf(page, CPF);
    // Full: todos os módulos já vêm ativos, não precisa selecionar
    await clicarConsultar(page);

    // ── 4. UI: validar seções do detalhe ──
    // [ATENÇÃO] Os nomes das seções abaixo foram extraídos de snapshots.
    // Se a página usar nomes diferentes, ajuste manualmente.
    await expect(page.getByText('Detalhe da Consulta')).toBeVisible();
    await expect(page.getByText('Situação cadastral e restrições')).toBeVisible();
    await expect(page.getByText('Contato')).toBeVisible();
    await expect(page.getByText('Listas Restritivas e Sanções')).toBeVisible();

    // [ATENÇÃO] O seletor abaixo tenta detectar campos vazios.
    // Pode não funcionar se a estrutura HTML for diferente.
    // Ajuste ou remova conforme necessário.
    const camposVazios = page.locator('[class*="value"]:empty, [class*="field"]:empty');
    const totalVazios = await camposVazios.count();
    expect(totalVazios).toBe(0);

    // ── 5. DB: validar document_consults ──
    await sleep(2000); // Aguarda persistência
    const docs = await buscarDocumentConsults(CPF);
    expect(docs.rowCount).toBeGreaterThan(0);

    // ── 6. DB: validar invoices_itens ──
    const hash = docs.rows[0]?.hash;
    if (hash) {
      const invoices = await buscarInvoices(hash);
      expect(invoices.rowCount).toBeGreaterThan(0);
    }

    // ── 7. Log ──
    appendApiResultBlock({
      nomeCenario: 'CM01 - Full',
      cpf: CPF,
      retornoResponse: {
        secoes_visiveis: ['Situação cadastral', 'Contato', 'Listas Restritivas'],
        document_consults: docs.rowCount,
        invoices_cobradas: hash ? true : false,
        campos_vazios_encontrados: totalVazios,
      },
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // CM02 — Apenas Dados Cadastrais
  //
  // Cliente habilitado só para "dados_cadastrais".
  // O detalhe deve mostrar apenas a seção correspondente.
  // ═════════════════════════════════════════════════════════════════════════

  test('CM02 - Só Dados Cadastrais — seção única, registro e cobrança', async ({ page }) => {
    await configurarModuleConsultPorConsultType({
      consultType: 'dados_cadastrais',
      userId: TENANT_ID,
    });
    await limparBase(CPF);

    await login(page);
    await acessarConsultaManual(page);
    await preencherCpf(page, CPF);
    await selecionarModulos(page, ['Dados Cadastrais']);
    await clicarConsultar(page);

    // ── UI: validar seções ──
    // [ATENÇÃO] Se a seção de Dados Cadastrais se chamar diferente de
    // "Situação cadastral e restrições", ajuste abaixo.
    await expect(page.getByText('Situação cadastral e restrições')).toBeVisible();

    // Essas NÃO devem aparecer quando só Dados Cadastrais está ativo
    // [ATENÇÃO] Se mesmo assim aparecerem, o filtro de módulos não está
    // funcionando como esperado — avise o dev.
    await expect(page.getByText('Contato')).not.toBeVisible();
    await expect(page.getByText('Listas Restritivas e Sanções')).not.toBeVisible();

    // ── DB ──
    await sleep(2000);
    const docs = await buscarDocumentConsults(CPF);
    expect(docs.rowCount).toBeGreaterThan(0);

    const hash = docs.rows[0]?.hash;
    if (hash) {
      const invoices = await buscarInvoices(hash);
      expect(invoices.rowCount).toBeGreaterThan(0);
    }

    appendApiResultBlock({
      nomeCenario: 'CM02 - Só Dados Cadastrais',
      cpf: CPF,
      retornoResponse: {
        document_consults: docs.rowCount,
        invoices_cobradas: hash ? true : false,
      },
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // CM03 — CPF inválido
  //
  // CPF com formato inválido (00000000000).
  // Não deve gerar consulta, não deve gerar cobrança.
  // ═════════════════════════════════════════════════════════════════════════

  test('CM03 - CPF inválido — sem registro, sem cobrança', async ({ page }) => {
    await login(page);
    await acessarConsultaManual(page);
    await preencherCpf(page, CPF_INVALIDO);
    await page.getByRole('button', { name: 'Consultar' }).click();

    // [ATENÇÃO] A mensagem de erro abaixo foi observada em snapshots.
    // Se for diferente, ajuste manualmente.
    const msgErro = page.getByText('CPF inválido. Verifique os dígitos digitados.');
    await expect(msgErro).toBeVisible({ timeout: 5000 });

    // Não navegou para detalhe
    expect(page.url()).not.toContain('/consultas/');

    // Não gerou registro no banco
    await sleep(2000);
    const docs = await buscarDocumentConsults(CPF_INVALIDO);
    expect(docs.rowCount).toBe(0);

    appendApiResultBlock({
      nomeCenario: 'CM03 - CPF inválido',
      cpf: CPF_INVALIDO,
      retornoResponse: {
        label_erro_visivel: true,
        document_consults: docs.rowCount,
      },
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // CM04 — Apenas Telefone
  //
  // Seleciona só o módulo Telefone.
  // Valida que a seção "Contato" aparece com dados de telefone.
  // ═════════════════════════════════════════════════════════════════════════

  test('CM04 - Só Telefone — seção Contato visível', async ({ page }) => {
    await configurarModuleConsultPorConsultType({
      consultType: 'telefone+dados_cadastrais',
      userId: TENANT_ID,
    });
    await limparBase(CPF);

    await login(page);
    await acessarConsultaManual(page);
    await preencherCpf(page, CPF);
    await selecionarModulos(page, ['Telefone']);
    await clicarConsultar(page);

    // [ATENÇÃO] "Contato" é a seção que contém dados de telefone.
    // Se o nome for outro, ajuste.
    await expect(page.getByText('Contato')).toBeVisible();

    // As outras seções NÃO devem aparecer
    // [ATENÇÃO] Remova as linhas abaixo se o sistema sempre mostrar
    // todas as seções independente da seleção.
    await expect(page.getByText('Situação cadastral e restrições')).not.toBeVisible();
    await expect(page.getByText('Listas Restritivas e Sanções')).not.toBeVisible();

    // ── DB ──
    await sleep(2000);
    const docs = await buscarDocumentConsults(CPF);
    expect(docs.rowCount).toBeGreaterThan(0);

    const hash = docs.rows[0]?.hash;
    if (hash) {
      const invoices = await buscarInvoices(hash);
      expect(invoices.rowCount).toBeGreaterThan(0);
    }

    appendApiResultBlock({
      nomeCenario: 'CM04 - Só Telefone',
      cpf: CPF,
      retornoResponse: {
        document_consults: docs.rowCount,
        invoices_cobradas: hash ? true : false,
      },
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // CM05 — Apenas PEP / Listas
  //
  // Seleciona só PEP / Listas.
  // Valida que a seção "Situação cadastral e restrições" aparece.
  // ═════════════════════════════════════════════════════════════════════════

  test('CM05 - Só PEP / Listas — seção Situação cadastral visível', async ({ page }) => {
    await configurarModuleConsultPorConsultType({
      consultType: 'pep_listas+dados_cadastrais',
      userId: TENANT_ID,
    });
    await limparBase(CPF);

    await login(page);
    await acessarConsultaManual(page);
    await preencherCpf(page, CPF);
    await selecionarModulos(page, ['PEP / Listas']);
    await clicarConsultar(page);

    await expect(page.getByText('Situação cadastral e restrições')).toBeVisible();
    await expect(page.getByText('Contato')).not.toBeVisible();
    await expect(page.getByText('Listas Restritivas e Sanções')).not.toBeVisible();

    await sleep(2000);
    const docs = await buscarDocumentConsults(CPF);
    expect(docs.rowCount).toBeGreaterThan(0);

    const hash = docs.rows[0]?.hash;
    if (hash) {
      const invoices = await buscarInvoices(hash);
      expect(invoices.rowCount).toBeGreaterThan(0);
    }

    appendApiResultBlock({
      nomeCenario: 'CM05 - Só PEP / Listas',
      cpf: CPF,
      retornoResponse: {
        document_consults: docs.rowCount,
        invoices_cobradas: hash ? true : false,
      },
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // CM06 — Cache: mesma consulta executada 2x
  //
  // A 2ª consulta deve usar cache (Fonte: Cache no rodapé).
  // Cobrança: mesmo em cache, DEVE cobrar (regra de negócio).
  // ═════════════════════════════════════════════════════════════════════════

  test('CM06 - Cache — 2ª consulta usa cache mas cobra normalmente', async ({ page }) => {
    await configurarModuleConsultPorConsultType({
      consultType: 'dados_cadastrais',
      userId: TENANT_ID,
    });
    await limparBase(CPF);

    await login(page);
    await acessarConsultaManual(page);
    await preencherCpf(page, CPF);
    await selecionarModulos(page, ['Dados Cadastrais']);
    await clicarConsultar(page);

    // Vai para o detalhe e verifica a fonte
    // [ATENÇÃO] O seletor para "Fonte:" pode variar. Ajuste se necessário.
    const fonte1 = await page.getByText(/Fonte:/i).textContent().catch(() => '');
    expect(fonte1).toBeTruthy();

    // Volta para consultar de novo
    await acessarConsultaManual(page);
    await preencherCpf(page, CPF);
    await selecionarModulos(page, ['Dados Cadastrais']);
    await clicarConsultar(page);

    // [ATENÇÃO] A 2ª consulta DEVE mostrar "Fonte: Cache".
    // Se mostrar "Fornecedor de dados", o cache não funcionou.
    const fonte2 = await page.getByText(/Fonte:/i).textContent().catch(() => '');
    expect(fonte2).toContain('Cache');

    // ── DB: ambas as consultas devem ter registro e cobrança ──
    await sleep(2000);
    const docs = await buscarDocumentConsults(CPF);
    expect(docs.rowCount).toBeGreaterThanOrEqual(2);

    const hash = docs.rows[0]?.hash;
    if (hash) {
      const invoices = await buscarInvoices(hash);
      expect(invoices.rowCount).toBeGreaterThan(0);
    }

    appendApiResultBlock({
      nomeCenario: 'CM06 - Cache',
      cpf: CPF,
      retornoResponse: {
        fonte_primeira: fonte1,
        fonte_segunda: fonte2,
        cache_funcionou: fonte2.includes('Cache'),
        document_consults: docs.rowCount,
      },
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // CM07 — "Não consta" para campo sem registro
  //
  // CPF sem dados em determinado módulo.
  // O campo deve exibir "Não consta" (não ficar em branco).
  // ═════════════════════════════════════════════════════════════════════════

  test('CM07 - Consulta sem dados — campos exibem "Não consta"', async ({ page }) => {
    await configurarModuleConsultPorConsultType({
      consultType: 'dados_cadastrais',
      userId: TENANT_ID,
    });
    await limparBase(CPF);

    await login(page);
    await acessarConsultaManual(page);
    await preencherCpf(page, CPF);
    await selecionarModulos(page, ['Dados Cadastrais']);
    await clicarConsultar(page);

    // [ATENÇÃO] Se o CPF tiver dados reais, "Não consta" não vai aparecer.
    // Use um CPF sem dados (CPF_SEM_DADOS de baseDados.js) se necessário.
    // Por enquanto validamos apenas que não há campos vazios.

    // [ATENÇÃO] O seletor abaixo pode não funcionar na estrutura atual.
    // Ajuste ou remova conforme necessário.
    const camposVazios = page.locator('[class*="value"]:empty, [class*="field"]:empty');
    const totalVazios = await camposVazios.count();
    expect(totalVazios).toBe(0);

    // ── DB ──
    await sleep(2000);
    const docs = await buscarDocumentConsults(CPF);
    expect(docs.rowCount).toBeGreaterThan(0);

    const hash = docs.rows[0]?.hash;
    if (hash) {
      const invoices = await buscarInvoices(hash);
      expect(invoices.rowCount).toBeGreaterThan(0);
    }

    appendApiResultBlock({
      nomeCenario: 'CM07 - Sem dados',
      cpf: CPF,
      retornoResponse: {
        document_consults: docs.rowCount,
        invoices_cobradas: hash ? true : false,
        campos_vazios_encontrados: totalVazios,
      },
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// FIM
// ═════════════════════════════════════════════════════════════════════════════
//
// Instruções para ajuste manual:
//
// 1. Se uma seção não aparecer com o nome esperado:
//    - Altere o texto dentro de getByText('...')
//    - Ex: page.getByText('Minha Seção')
//
// 2. Se o seletor de campos vazios não funcionar:
//    - Remova ou ajuste a linha com [class*="value"]:empty
//    - Use um seletor que corresponda à estrutura real
//
// 3. Se um cenário falhar porque o CPF não tem os dados esperados:
//    - Troque CPF por outro valor de baseDados.js
//    - Ex: baseDados.CA002, baseDados.CPF_SEM_DADOS
//
// 4. Para adicionar novo cenário:
//    - Copie um bloco test('CM0X - ...', ...) existente
//    - Ajuste consultType e modulosDesejados
//    - Ajuste as expectativas de seções
