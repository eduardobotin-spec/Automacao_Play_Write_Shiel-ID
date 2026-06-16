import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

import { limparBanco } from '../services/limparBanco.js';
import { limparConsultasPorCpf } from '../services/limparConsultasPorCpf.js';
import { configurarModuleConsultPorConsultType } from '../services/configurarModuleConsult.js';
import { appendApiResultBlock } from '../services/apiResultLog.js';
import * as baseDados from '../services/baseDados.js';

const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';

const MOBILE_VIEWPORT = { width: 375, height: 812 };
const SCREENSHOT_DIR = './logs_fingerprint';

function basicAuth() {
  return `Basic ${Buffer.from(`${apiUser}:${apiPass}`).toString('base64')}`;
}

const KYC_FRONT = 'https://api.shielid-staging.com';

async function gerarHashKyc(request, cenario = 'CA001') {
  const cpf = baseDados[cenario];
  const authHeader = basicAuth();
  const hashRes = await request.post(
    `https://shielid-staging.com/api/getNewHashKYC?documentExpected=${cpf}`,
    { headers: { Authorization: authHeader } }
  );
  const body = await hashRes.json();
  const d = body?.data && typeof body.data === 'object' ? body.data : null;
  const hash = body?.hash ?? d?.hash;
  const hashChecker = body?.hashChecker ?? body?.hash_checker ?? d?.hashChecker ?? d?.hash_checker;
  const steps = body?.steps ?? d?.steps ?? [];
  const urlKyc = body?.url ?? d?.url;
  return { hash, hashChecker, steps, urlKyc, cpf, body };
}

async function screenshot(page, name) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

test.describe('Fingerprint KYC — Exploratório', () => {

  test.beforeAll(async () => {
    await configurarModuleConsultPorConsultType({ consultType: 'dados_cadastrais' });
    const cpf = baseDados.CA001;
    await limparConsultasPorCpf(cpf);
    await limparBanco();
  });

  test('Explorar fluxo KYC web mobile', async ({ request, playwright }) => {
    // 1 - Gerar hash + obter URL do KYC
    const { hash, hashChecker, steps, urlKyc, cpf, body } = await gerarHashKyc(request, 'CA001');
    expect(hash).toBeTruthy();
    expect(hashChecker).toBeTruthy();
    console.log('Hash:', hash);
    console.log('HashChecker:', hashChecker);
    console.log('Steps:', steps);
    console.log('URL KYC (API):', urlKyc);
    console.log('CPF:', cpf);
    console.log('Response:', JSON.stringify(body, null, 2));

    appendApiResultBlock({
      nomeCenario: 'EXPLORATORIO - Hash gerado',
      cpf,
      retornoResponse: { hash, hashChecker, steps, urlKyc },
    });

    // 2 - Lançar navegador Firefox (melhor suporte software rendering no WSL)
    const browser = await playwright.firefox.launch({
      headless: false,
    });
    const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
    const page = await context.newPage();

    context.on('console', msg => {
      if (msg.type() === 'error') console.log('CONSOLE ERRO:', msg.text());
      if (msg.text().toLowerCase().includes('fingerprint') || msg.text().toLowerCase().includes('fpjs')) {
        console.log('CONSOLE FP:', msg.text());
      }
    });
    context.on('request', req => {
      const url = req.url();
      if (url.includes('fingerprint') || url.includes('fpjs') || url.includes('visitor') || url.includes('getVisitor')) {
        console.log('NETWORK FP:', url);
      }
    });

    const targetUrl = urlKyc || `${KYC_FRONT}/kyc/${hashChecker}/${hash}`;
    console.log('Navegando para:', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => {
      console.log('Erro navegação:', e.message?.slice(0, 200));
    });
    await page.waitForTimeout(2000);
    await screenshot(page, '01-primeira-tela');

    // 3 - Capturar info da página
    const html = await page.content();
    fs.writeFileSync(path.join(SCREENSHOT_DIR, `page-${hash}.html`), html);
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());
    console.log('HTML length:', html.length);

    // 4 - Listar elementos interativos
    const botoes = await page.locator('button, a, [role="button"], input[type="submit"], input[type="button"]').all();
    console.log('Elementos clicáveis:', botoes.length);
    for (const btn of botoes) {
      const text = await btn.textContent().catch(() => '');
      const placeholder = await btn.getAttribute('placeholder').catch(() => '');
      const aria = await btn.getAttribute('aria-label').catch(() => '');
      const visible = await btn.isVisible().catch(() => false);
      const label = text?.trim() || placeholder || aria || '(sem texto)';
      if (visible) console.log(`  [${await btn.evaluate(e => e.tagName)}] "${label}"`);
    }

    // 5 - Adicionar listeners de debug
    const pageErrors = [];
    page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.message);
      pageErrors.push(err.message);
    });
    page.on('crash', () => console.log('PAGE CRASHED'));
    page.on('dialog', dialog => {
      console.log('DIALOG:', dialog.type(), dialog.message());
      dialog.dismiss().catch(() => {});
    });
    page.on('response', resp => {
      if (resp.status() >= 400) {
        console.log(`HTTP ${resp.status()}: ${resp.url().slice(0, 150)}`);
      }
    });

    // 6 - Tentar clicar Continue
    const btnContinue = page.getByRole('button', { name: /continue|continuar|iniciar|próximo|next|começar/i }).first();
    if (await btnContinue.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Clicando em Continue...');
      await btnContinue.click();
      await page.waitForTimeout(6000);
      await screenshot(page, '02-apos-continuar');
      console.log('URL após click:', page.url());

      const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000));
      console.log('Texto visível após click:', bodyText);
    }

    // 7 - Verificar detecção de automação
    const botDetection = await page.evaluate(() => ({
      webdriver: navigator.webdriver,
      chrome: !!window.chrome,
      plugins: navigator.plugins?.length,
      languages: navigator.languages,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
    }));
    console.log('Bot detection signals:', JSON.stringify(botDetection, null, 2));

    // 8 - Aguardar interação manual se headed
    console.log('Aguardando 180s para exploração manual...');
    await page.waitForTimeout(180000);

    appendApiResultBlock({
      nomeCenario: 'EXPLORATORIO - Fluxo completo',
      cpf,
      retornoResponse: {
        hash,
        hashChecker,
        steps,
        urlFinal: page.url(),
        pageTitle: await page.title(),
      },
    });

    await browser.close();
  });

});
