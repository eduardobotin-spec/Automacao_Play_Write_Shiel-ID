/**
 * ============================================================
 * SUITE: Fingerprint KYC — Tarefa #318
 * ============================================================
 * Objetivo: Validar a coleta e persistência de fingerprint de
 * device no fluxo KYC (FingerprintJS open-source).
 *
 * Critérios de aceite (Tarefa #318):
 *   • FingerprintJS integrado no frontend KYC
 *   • Fingerprint salvo em hash_jsons.json.devices após o KYC
 *   • Atributos acessíveis no dashboard
 *   • Identificar mesmo device com CPF diferente (visitor_id)
 *   • Identificar VPN (via Tor — socks5://127.0.0.1:9050)
 *   • Identificar bot (Playwright com webdriver: true)
 *   • Tentar identificar injeção de câmera
 *
 * Status dos cenários:
 *   CT001–CT004, CT006–CT007 → test.skip (aguarda feature #318)
 *   CT005 → ativo (Tor em localhost:9050 — requer tor.exe rodando)
 *
 * Como rodar CT005:
 *   1. tor\tor.exe (na pasta do Tor Expert Bundle)
 *   2. Aguardar "Bootstrapped 100% (done): Done"
 *   3. npx playwright test tests/fingerprint-kyc.spec.js --grep CT005
 * ============================================================
 */

import net from 'net';
import { test, expect, chromium } from '@playwright/test';
import { gerarHash } from '../services/gerarHash.js';
import { buscarFingerprintNoDb, buscarVisitorIdEmMultiplasHashes } from '../services/buscarFingerprintNoDb.js';
import { appendApiResultBlock } from '../services/apiResultLog.js';
import * as baseDados from '../services/baseDados.js';

const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';

const KYC_FRONT = 'https://api.shielid-staging.com';
const MOBILE_VIEWPORT = { width: 375, height: 812 };

function basicAuth() {
  return `Basic ${Buffer.from(`${apiUser}:${apiPass}`).toString('base64')}`;
}

/** Monta a URL do KYC a partir do hash retornado pelo getNewHashKYC */
function montarUrlKyc(hash, hashChecker) {
  return `${KYC_FRONT}/kyc/${hashChecker}/${hash}`;
}

/** Verifica se o Tor está rodando na porta 9050 */
function torEstaAtivo() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 9050 });
    socket.setTimeout(2000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => resolve(false));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CT001 — Fingerprint gerado na rede durante o KYC
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CT001 — Fingerprint gerado na rede durante o KYC', () => {
  test.skip(true, 'Aguardando implementação da feature FingerprintJS — Tarefa #318');

  test('CT001 - Requisição ao FingerprintJS é disparada ao clicar Continuar', async ({ request, playwright }) => {
    const { hash, hash_checker } = await gerarHash(request, 'CA001');
    const url = montarUrlKyc(hash, hash_checker);

    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
    const page = await context.newPage();

    const fpRequests = [];
    context.on('request', req => {
      const u = req.url();
      if (u.includes('fingerprint') || u.includes('fpjs') || u.includes('visitor')) {
        fpRequests.push(u);
      }
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Clica em Continuar para disparar a coleta do fingerprint
    const btnContinue = page.getByRole('button', { name: /continuar|continue|iniciar|começar/i }).first();
    if (await btnContinue.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnContinue.click();
      await page.waitForTimeout(3000);
    }

    expect(fpRequests.length).toBeGreaterThan(0);

    appendApiResultBlock({
      nomeCenario: 'CT001 - Fingerprint gerado na rede',
      cpf: baseDados.CA001,
      retornoResponse: { fpRequests },
    });

    await browser.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CT002 — Fingerprint salvo em hash_jsons.devices após o KYC
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CT002 — Fingerprint salvo em hash_jsons.devices', () => {
  test.skip(true, 'Aguardando implementação da feature FingerprintJS — Tarefa #318');

  test('CT002 - hash_jsons.devices tem ao menos um registro após gerar hash', async ({ request }) => {
    const { hash, cpf } = await gerarHash(request, 'CA001');

    // Aguarda processamento assíncrono do fingerprint
    await new Promise(r => setTimeout(r, 5000));

    const { found, devices } = await buscarFingerprintNoDb(hash);

    expect(found).toBe(true);
    expect(devices.length).toBeGreaterThan(0);

    appendApiResultBlock({
      nomeCenario: 'CT002 - Fingerprint salvo no banco',
      cpf,
      retornoResponse: { hash, devices },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CT003 — Atributos do device exibidos no dashboard
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CT003 — Dados do device exibidos no dashboard', () => {
  test.skip(true, 'Aguardando implementação da feature FingerprintJS — Tarefa #318');

  test('CT003 - Dashboard exibe dados de device para a hash KYC', async ({ request, page }) => {
    const { hash, cpf } = await gerarHash(request, 'CA001');

    // Navega para o detalhe da hash no dashboard administrativo
    await page.goto(`https://painel.shielid-staging.com/registros/${hash}`);

    // Verifica presença de seção de device/fingerprint
    await expect(
      page.getByText(/device|fingerprint|visitor.?id/i)
    ).toBeVisible({ timeout: 15000 });

    appendApiResultBlock({
      nomeCenario: 'CT003 - Dados do device no dashboard',
      cpf,
      retornoResponse: { hash },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CT004 — Mesmo device identificado com CPF diferente
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CT004 — Mesmo device com CPF diferente', () => {
  test.skip(true, 'Aguardando implementação da feature FingerprintJS — Tarefa #318');

  test('CT004 - Sistema identifica visitor_id repetido em hashes distintas', async ({ request, playwright }) => {
    // KYC 1 — CA001
    const { hash: hash1 } = await gerarHash(request, 'CA001');

    // KYC 2 — CA002 (CPF diferente, mesmo browser context = mesmo fingerprint)
    const { hash: hash2 } = await gerarHash(request, 'CA002');

    // Abre ambos no mesmo context de browser para gerar o mesmo visitor_id
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });

    let visi