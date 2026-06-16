/**
 * FLOW — KYC: Campo de Telefone (/send-phone-token)
 * Tarefa: #269 — Melhorar tela do campo de envio de telefone
 * Status: Em teste (16/06/2026)
 *
 * ESTRATÉGIA:
 *   A URL da jornada KYC é FORNECIDA manualmente (constante KYC_URL abaixo).
 *   Não geramos URL via painel: a configuração da jornada já é coberta por
 *   specs/painel/configuracoes/kyc-configuracao.spec.js. Aqui validamos SÓ o campo telefone.
 *
 *   A tela segue o idioma detectado (IP/navegador) e pode subir em inglês.
 *   garantirPortugues() troca para PT-BR via o seletor de idioma antes de cada teste.
 *
 * COMO RODAR:
 *   1) Edite KYC_URL abaixo (ou rode com env: KYC_URL="https://..." npx playwright test)
 *   2) npx playwright test specs/fluxos/kyc-risco-zero-sem-email.spec.js --ui
 *
 * DOM CONFIRMADO via trace em 16/06/2026 — /send-phone-token:
 *   - Seletor idioma:  button[aria-label="Escolher idioma"]  (aria-haspopup="menu")
 *   - Seletor país:    button[aria-haspopup="listbox"]  (aria-label="Select country", contém "+55")
 *     ⚠ o aria-label esconde o "+55" do nome acessível — NÃO usar getByRole name:/\+55/
 *   - Campo tel:       input[type="tel"]  — inputmode="tel", autocomplete="tel", placeholder "(XX) XXXXX-XXXX"
 *   - Botão avançar:   button com texto "Continuar"/"Continue" (disabled até número válido)
 *
 * AINDA NÃO CONFIRMADO no DOM (precisa de rodada real p/ travar seletor):
 *   - Opções do menu de idioma  - itens da lista de países / opção "Outros"
 *   - Mensagem "Número incompleto"  - atributo aria-invalid  - ícone de check (CA-3)
 */

import { test, expect } from '@playwright/test';

// ─── URL da jornada — EDITE AQUI a cada rodada (ou use a env var KYC_URL) ──────
const KYC_URL = process.env.KYC_URL
  || 'https://shielid-staging.com/kyc/D7n4g9InxXWV52UE/HoRZvAetrMlOS6kE5jVmcnHlj9yNPEy4';

// ─── locators estáveis (independentes de idioma) ───────────────────────────────
const seletorPais     = (page) => page.locator('button[aria-haspopup="listbox"]');
const botaoContinuar  = (page) => page.getByRole('button', { name: /continuar|continue/i });
const campoTelefone   = (page) => page.locator('input[type="tel"]');
const listaPaises     = (page) => page.locator('[role="listbox"], [role="menu"], [role="dialog"]').first();

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Garante a tela em português trocando pelo seletor de idioma, se necessário. */
async function garantirPortugues(page) {
  // Já está em PT? (texto da tela contém "celular")
  if (await page.getByText(/n[úu]mero de celular/i).count() > 0) return;

  const idiomaBtn = page.getByRole('button', { name: 'Escolher idioma' });
  if (await idiomaBtn.count() === 0) return; // sem seletor — segue como está

  await idiomaBtn.click();
  // Opção de português dentro do menu aberto (texto ou bandeira do Brasil)
  const opcaoPt = page.getByRole('menu').getByText(/portugu[êe]s|brasil/i).first();
  await opcaoPt.click({ timeout: 5000 }).catch(async () => {
    // fallback: tenta qualquer item visível de PT fora de role=menu
    await page.getByText(/portugu[êe]s|brasil/i).first().click({ timeout: 3000 }).catch(() => {});
  });
  await page.getByText(/n[úu]mero de celular/i).waitFor({ timeout: 5000 }).catch(() => {});
}

/** Abre uma aba isolada direto no /send-phone-token e garante PT-BR. */
async function abrirTelefone(browser) {
  const ctx  = await browser.newContext({ locale: 'pt-BR' });
  const page = await ctx.newPage();
  await page.goto(`${KYC_URL}/send-phone-token`);
  await expect(
    page.getByText(/n[úu]mero de celular|mobile number/i),
    'Tela de telefone não carregou — verifique se a KYC_URL é válida e aponta para o passo do telefone'
  ).toBeVisible({ timeout: 15000 });
  await garantirPortugues(page);
  return { ctx, page };
}

// ─── suite ────────────────────────────────────────────────────────────────────

test.describe('Campo Telefone — KYC (task #269)', () => {

  // Guarda: sem URL não há o que testar — falha imediata e legível
  test.beforeAll(() => {
    if (!KYC_URL || !/\/kyc\//.test(KYC_URL)) {
      throw new Error(
        'KYC_URL não definida ou inválida. Edite a constante KYC_URL no topo do spec '
        + 'ou rode com KYC_URL="https://shielid-staging.com/kyc/..." npx playwright test'
      );
    }
    console.log('[suite] KYC_URL em uso:', KYC_URL);
  });

  // ── Estado inicial da tela ──────────────────────────────────────────────────

  // CA-1 — Rótulo "Celular" / texto do campo visível
  test('CA-1: rótulo "Celular" está visível na tela', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      await expect(page.getByText(/celular/i)).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  // CA-2 / BDD-1 — País padrão BR (+55), máscara (XX) XXXXX-XXXX
  test('CA-2/BDD-1: país padrão é Brasil (+55) e máscara BR aplicada', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      await expect(seletorPais(page)).toContainText('+55');
      await expect(campoTelefone(page)).toHaveAttribute('placeholder', '(XX) XXXXX-XXXX');
    } finally {
      await ctx.close();
    }
  });

  // CA-8 — Botão "Continuar" desabilitado ao carregar (campo vazio)
  test('CA-8: botão "Continuar" desabilitado sem input', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      await expect(botaoContinuar(page)).toBeDisabled();
    } finally {
      await ctx.close();
    }
  });

  // CA-10 — Acessibilidade: inputmode="tel" e autocomplete="tel"
  test('CA-10: campo tem inputmode="tel" e autocomplete="tel"', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      const input = campoTelefone(page);
      await expect(input).toHaveAttribute('inputmode', 'tel');
      await expect(input).toHaveAttribute('autocomplete', 'tel');
    } finally {
      await ctx.close();
    }
  });

  // CA-10 — Acessibilidade: área de toque do seletor ≥ 44px (WCAG)
  test('CA-10: área de toque do seletor de país tem altura ≥ 44px', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      const box = await seletorPais(page).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    } finally {
      await ctx.close();
    }
  });

  // ── Validação do número BR ───────────────────────────────────────────────────

  // CA-3 / BDD-3 — Número completo: formata (11) 98765-4321 e habilita botão
  test('CA-3/BDD-3: número válido BR formata corretamente e habilita "Continuar"', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      const phoneInput = campoTelefone(page);
      await phoneInput.fill('11987654321');
      await expect(phoneInput).toHaveValue('(11) 98765-4321');
      await expect(botaoContinuar(page)).toBeEnabled({ timeout: 5000 });
    } finally {
      await ctx.close();
    }
  });

  // CA-3 — Número válido exibe ícone de check
  test.skip('CA-3: número válido exibe ícone de sucesso (check)', async () => {
    // TODO: mapear seletor do ícone de check após inspeção do DOM em staging
  });

  // CA-4 / BDD-2 — Número incompleto: botão disabled + mensagem "Número incompleto"
  test('CA-4/BDD-2: número incompleto desabilita botão e exibe "Número incompleto"', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      const phoneInput = campoTelefone(page);
      await phoneInput.fill('1198765');
      await phoneInput.blur();
      await expect(botaoContinuar(page)).toBeDisabled();
      await expect(page.getByText(/n[úu]mero incompleto|incomplete/i)).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  // CA-10 — Acessibilidade: aria-invalid="true" quando número incompleto
  test('CA-10: campo recebe aria-invalid="true" quando número incompleto', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      const phoneInput = campoTelefone(page);
      await phoneInput.fill('1198765');
      await phoneInput.blur();
      await expect(phoneInput).toHaveAttribute('aria-invalid', 'true');
    } finally {
      await ctx.close();
    }
  });

  // CA-7 / BDD-7 — Apenas dígitos aceitos; letras e símbolos ignorados
  test('CA-7/BDD-7: letras e símbolos são ignorados no campo', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      const phoneInput = campoTelefone(page);
      await phoneInput.fill('abc11@987#654');
      const valor = await phoneInput.inputValue();
      expect(valor).toMatch(/^[\d()\s\-]*$/);
    } finally {
      await ctx.close();
    }
  });

  // ── Seletor de país ──────────────────────────────────────────────────────────

  // CA-2 — Seletor de país é clicável e abre lista pesquisável
  test('CA-2: seletor de país é clicável e abre lista pesquisável', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      const seletor = seletorPais(page);
      await expect(seletor).toBeEnabled();
      await seletor.click();
      await expect(listaPaises(page)).toBeVisible({ timeout: 5000 });
    } finally {
      await ctx.close();
    }
  });

  // CA-11 / BDD-8 — Lista de países tem opção "Outros"
  test('CA-11/BDD-8: lista de países exibe opção "Outros"', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      await seletorPais(page).click();
      const lista = listaPaises(page);
      await expect(lista).toBeVisible({ timeout: 5000 });
      await expect(lista.getByText(/outro/i)).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  // CA-5 / BDD-4 — Trocar país mantém dígitos e reaplica máscara
  test('CA-5/BDD-4: trocar país mantém dígitos e aplica nova máscara', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      await campoTelefone(page).fill('1140041234');
      await seletorPais(page).click();
      const lista = listaPaises(page);
      await expect(lista).toBeVisible({ timeout: 5000 });
      await lista.getByText(/EUA|Estados Unidos|United States/i).click();

      await expect(seletorPais(page)).toContainText('+1');
      const valor = await campoTelefone(page).inputValue();
      expect(valor.replace(/\D/g, '')).not.toBe('');
    } finally {
      await ctx.close();
    }
  });

  // BDD-9 — Trocar país com número incompleto não exibe mensagem de erro
  test('BDD-9: trocar país com número incompleto não exibe mensagem de erro', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      await campoTelefone(page).fill('1198765'); // incompleto para BR
      await seletorPais(page).click();
      const lista = listaPaises(page);
      await expect(lista).toBeVisible({ timeout: 5000 });
      await lista.getByText(/EUA|Estados Unidos|United States/i).click();
      await expect(page.getByText(/n[úu]mero incompleto|incomplete/i)).not.toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  // BDD-10 / CA-10 — Ao trocar país com valor preenchido, cursor vai ao final
  test('BDD-10: ao trocar país cursor posiciona ao final do conteúdo', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      await campoTelefone(page).fill('11987654321');
      await seletorPais(page).click();
      const lista = listaPaises(page);
      await expect(lista).toBeVisible({ timeout: 5000 });
      await lista.getByText(/EUA|Estados Unidos|United States/i).click();
      const cursorNoFinal = await campoTelefone(page).evaluate(
        el => el.selectionStart === el.value.length
      );
      expect(cursorNoFinal).toBe(true);
    } finally {
      await ctx.close();
    }
  });

  // CA-6 / BDD-5 — Colar número com DDI detecta país e remove DDI do campo
  test('CA-6/BDD-5: colar número com DDI detecta país e separa DDI', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      const phoneInput = campoTelefone(page);
      await phoneInput.click();
      await page.keyboard.insertText('+55 11 98765-4321');
      await expect(seletorPais(page)).toContainText('+55');
      const valor = await phoneInput.inputValue();
      expect(valor).not.toContain('+55');
      expect(valor.replace(/\D/g, '')).toMatch(/98765/);
    } finally {
      await ctx.close();
    }
  });

  // BDD-6 — Falha na detecção de locale → "+XX" com ícone de globo
  test.skip('BDD-6: falha na detecção exibe "+XX" com ícone de globo', async () => {
    // Não testável headless: depende de bloqueio real de geolocalização
  });

  // ── Modo "Outros" (país manual) ───────────────────────────────────────────────

  // CA-11 — Opção "Outros": DDI editável, sem máscara no telefone
  test('CA-11: "Outros" deixa campo DDI editável e remove máscara', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      await seletorPais(page).click();
      const lista = listaPaises(page);
      await expect(lista).toBeVisible({ timeout: 5000 });
      await lista.getByText(/outro/i).click();
      const ddiInput = page.locator('input[placeholder*="DDI"]').first();
      await expect(ddiInput).toBeEditable();
      const phonePlaceholder = await campoTelefone(page).getAttribute('placeholder');
      expect(phonePlaceholder).not.toMatch(/\(XX\)/);
    } finally {
      await ctx.close();
    }
  });

  // CA-12 — "Outro": REGRA — DDI mín 1 / máx 4 e telefone mín 5 / máx 15.
  //         Dentro desses limites o botão "Continuar" fica HABILITADO; fora, desabilitado.
  test('CA-12: "Outro" — DDI 1–4 e telefone 5–15 controlam o botão "Continuar"', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      await seletorPais(page).click();
      await listaPaises(page).getByText(/outro/i).click();

      const ddiInput   = page.locator('input[placeholder*="DDI"]').first();
      const phoneInput = campoTelefone(page);

      // Limite superior: DDI trava em 4 chars; telefone trava em 15 dígitos
      await ddiInput.fill('12345');
      expect((await ddiInput.inputValue()).length).toBeLessThanOrEqual(4);
      await phoneInput.fill('1234567890123456'); // 16 dígitos
      expect((await phoneInput.inputValue()).replace(/\D/g, '').length).toBeLessThanOrEqual(15);

      // Telefone abaixo do mínimo (4 < 5), DDI válido → desabilitado
      await ddiInput.fill('1');
      await phoneInput.fill('1234');
      await phoneInput.blur();
      await expect(botaoContinuar(page)).toBeDisabled();

      // DDI vazio (abaixo do mínimo 1), telefone válido → desabilitado
      await ddiInput.fill('');
      await phoneInput.fill('12345');
      await phoneInput.blur();
      await expect(botaoContinuar(page)).toBeDisabled();

      // Dentro da regra (mínimos): DDI 1 + telefone 5 → HABILITADO
      await ddiInput.fill('1');
      await phoneInput.fill('12345');
      await expect(botaoContinuar(page)).toBeEnabled();

      // Dentro da regra (máximos): DDI 4 + telefone 15 → HABILITADO
      await ddiInput.fill('1234');
      await phoneInput.fill('123456789012345');
      await expect(botaoContinuar(page)).toBeEnabled();
    } finally {
      await ctx.close();
    }
  });

  // BDD-11 — "Outros": DDI mantido ao trocar país e voltar antes do reload
  test('BDD-11: "Outros" mantém DDI ao trocar de país e retornar', async ({ browser }) => {
    const { ctx, page } = await abrirTelefone(browser);
    try {
      await seletorPais(page).click();
      const lista1 = listaPaises(page);
      await expect(lista1).toBeVisible({ timeout: 5000 });
      await lista1.getByText(/outro/i).click();

      const ddiInput = page.locator('input[placeholder*="DDI"]').first();
      await ddiInput.fill('999');

      // Troca para Brasil
      await seletorPais(page).click();
      const lista2 = listaPaises(page);
      await expect(lista2).toBeVisible({ timeout: 5000 });
      await lista2.getByText(/brasil|brazil/i).click();

      // Volta para "Outros"
      await seletorPais(page).click();
      const lista3 = listaPaises(page);
      await expect(lista3).toBeVisible({ timeout: 5000 });
      await lista3.getByText(/outro/i).click();

      const ddiVal = await ddiInput.inputValue();
      expect(ddiVal).toBe('999');
    } finally {
      await ctx.close();
    }
  });

});
