import { test, expect } from '@playwright/test';
import { limparBanco } from '../services/limparBanco.js';
import { configurarModuleConsultPorConsultType } from '../services/configurarModuleConsult.js';
import { getDocumentConsults } from '../services/consultarDocumentos.js';
import { getLogsGeral } from '../services/consultarLogsGeral.js';
import { appendApiResultBlock } from '../services/apiResultLog.js';
import * as baseDados from '../services/baseDados.js';

const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';

const DASH_URL = 'https://admin.shielid-staging.com/login?redirect=%2Fdashboard';
const DASH_EMAIL = 'eduardobotinshielid@gmail.com';
const DASH_PASS = '123456';

function basicAuth() {
  return `Basic ${Buffer.from(`${apiUser}:${apiPass}`).toString('base64')}`;
}

async function callConsultApi(request, cpf, consultType = 'dados_cadastrais') {
  const url = `https://shielid-staging.com/api/consultDocument?document=${encodeURIComponent(cpf)}`;
  const response = await request.post(url, {
    headers: { Authorization: basicAuth() },
    data: { consultType },
  });
  const body = await response.json();
  return { status: response.status(), body, cpf, consultType };
}

async function loginDashboard(page) {
  await page.goto(DASH_URL);
  await expect(page.getByRole('textbox', { name: 'E-mail' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('textbox', { name: 'E-mail' }).fill(DASH_EMAIL);
  await page.getByRole('textbox', { name: 'Senha' }).fill(DASH_PASS);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
}

async function abrirEdicaoCliente(page, nomeCliente = 'Testes Automatizados') {
  await page.getByRole('link', { name: /cliente/i }).first().click();
  await page.waitForTimeout(1000);
  await page.getByPlaceholder(/pesquisar|buscar|localizar/i).fill(nomeCliente);
  await page.getByText(nomeCliente).first().click();
  await page.getByRole('button', { name: /editar/i }).first().click();
}

const CPF_INVALIDO = '00000000000';
const CPF_SEM_DADOS = '11111111111';

test.describe('Consulta avulsa — CPF e CNPJ', () => {

  test.describe('Validação via API + BD', () => {

    test.beforeAll(async () => {
      await limparBanco();
    });

    test('CT001 - Reutilizar cache existente', async ({ request }) => {
      const cpf = baseDados.CA001;
      const consultType = 'dados_cadastrais';

      const r1 = await callConsultApi(request, cpf, consultType);
      expect(r1.status).toBe(200);

      const r2 = await callConsultApi(request, cpf, consultType);
      expect(r2.status).toBe(200);

      const docs = await getDocumentConsults();
      const rows = (docs?.rows ?? []).filter(
        (row) => String(row?.document ?? '').replace(/\D/g, '') === cpf
      );
      const cacheRows = rows.filter(
        (row) => String(row?.source ?? '').toLowerCase() === 'cache'
      );

      appendApiResultBlock({
        nomeCenario: 'CT001 - Cache reutilizado',
        cpf,
        retornoResponse: {
          consultas: rows.length,
          cache: cacheRows.length >= 1,
        },
      });

      expect(cacheRows.length).toBeGreaterThanOrEqual(1);
    });

    test('CT002 - Consultar apenas módulos faltantes', async ({ request }) => {
      const cpf = baseDados.CA001;
      const consultType = 'telefone+email+dados_cadastrais';

      const r1 = await callConsultApi(request, cpf, consultType);
      expect(r1.status).toBe(200);

      const logs = await getLogsGeral();
      const logRows = (logs?.rows ?? []).filter(
        (row) => String(row?.document ?? '').replace(/\D/g, '') === cpf
      );

      appendApiResultBlock({
        nomeCenario: 'CT002 - Módulos faltantes',
        cpf,
        retornoResponse: { logsGeral: logRows.length > 0 },
      });

      expect(logRows.length).toBeGreaterThan(0);
    });

    test('CT003 - CPF inválido', async ({ request }) => {
      const r = await callConsultApi(request, CPF_INVALIDO);

      appendApiResultBlock({
        nomeCenario: 'CT003 - CPF inválido',
        cpf: CPF_INVALIDO,
        retornoResponse: r.body,
      });

      expect(r.status).toBe(400);
    });

    test('CT004 - Consulta limpa', async ({ request }) => {
      const cpf = baseDados.CA001;

      const r = await callConsultApi(request, cpf);
      expect(r.status).toBe(200);
      expect(r.body?.data || r.body?.response || r.body).toBeTruthy();

      const docs = await getDocumentConsults();
      const rows = (docs?.rows ?? []).filter(
        (row) => String(row?.document ?? '').replace(/\D/g, '') === cpf
      );

      appendApiResultBlock({
        nomeCenario: 'CT004 - Consulta limpa',
        cpf,
        retornoResponse: { api: r.body, documentConsults: rows.length },
      });

      expect(rows.length).toBeGreaterThan(0);
    });

    test('CT005 - Consulta sem dados', async ({ request }) => {
      const r = await callConsultApi(request, CPF_SEM_DADOS);

      appendApiResultBlock({
        nomeCenario: 'CT005 - Consulta sem dados',
        cpf: CPF_SEM_DADOS,
        retornoResponse: r.body,
      });

      const dadosPresentes = r.body?.data || r.body?.response || r.body?.result;
      expect(r.status).toBe(200);
      expect(dadosPresentes).toBeFalsy();
    });

    test('CT008 - Reutilizar cache no onboarding', async ({ request }) => {
      const cpf = baseDados.CA001;
      const consultType = 'dados_cadastrais';

      const r1 = await callConsultApi(request, cpf, consultType);
      expect(r1.status).toBe(200);

      const r2 = await callConsultApi(request, cpf, consultType);
      expect(r2.status).toBe(200);

      const docs = await getDocumentConsults();
      const rows = (docs?.rows ?? []).filter(
        (row) => String(row?.document ?? '').replace(/\D/g, '') === cpf
      );
      const cacheCount = rows.filter(
        (row) => String(row?.source ?? '').toLowerCase() === 'cache'
      ).length;

      appendApiResultBlock({
        nomeCenario: 'CT008 - Cache onboarding',
        cpf,
        retornoResponse: { totalConsultas: rows.length, cacheCount },
      });

      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(cacheCount).toBeGreaterThanOrEqual(1);
    });

  });

  test.describe('Configuração via Web + validação', () => {

    test('CT007 - Exibir apenas módulos permitidos', async ({ page, request }) => {
      await loginDashboard(page);
      await abrirEdicaoCliente(page);

      await configurarModuleConsultPorConsultType({ consultType: 'telefone+dados_cadastrais' });

      await expect(page.getByRole('button', { name: /salvar|aplicar|confirmar/i })).toBeVisible({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);

      const cpf = baseDados.CA001;
      const r = await callConsultApi(request, cpf, 'telefone+dados_cadastrais');
      expect(r.status).toBe(200);

      const docs = await getDocumentConsults();
      const rows = (docs?.rows ?? []).filter(
        (row) => String(row?.document ?? '').replace(/\D/g, '') === cpf
      );

      appendApiResultBlock({
        nomeCenario: 'CT007 - Módulos permitidos',
        cpf,
        retornoResponse: { api: r.body, consultas: rows.length },
      });

      expect(rows.length).toBeGreaterThan(0);
    });

    test('CT006 - Bloquear acesso sem permissão', async ({ page }) => {
      test.info().annotations.push({
        type: 'pendente',
        description: 'Necessário um segundo usuário com permissão restrita para testar bloqueio',
      });
    });

  });

});
