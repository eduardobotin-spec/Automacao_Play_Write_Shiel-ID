/**
 * SPEC — Configuração KYC (Painel / Configurações)
 * URL: /configuracoes/jornada
 *
 * Tarefa de referência: #269 — Melhorar tela do campo de envio de telefone
 * O que este spec cobre: tela de configuração KYC — presets, switches de validação, salvar.
 * NÃO é o fluxo completo do usuário final passando pelo KYC (isso seria um spec de "jornada").
 * Fluxo testado: login painel → Configurações → Configurar Jornada KYC → Risco Zero → Salvar
 *
 * ESTRUTURA DOM mapeada em 16/06/2026:
 *   - 3 presets: cards DIV clicáveis (sem aria-selected)
 *   - 8 switches [role="switch"] sem id/name — identificados por texto do card pai
 *   - input[type="number"] único — "Tentativas máximas"
 *   - Preset "Risco Zero" define tentativas=2 e ativa todas as validações incluindo Telefone
 *
 * ESTRATÉGIA:
 *   Smoke mínimo ativo → valida que o fluxo funciona hoje.
 *   Cenários de detalhe como test.skip → ativar conforme task #269 for entregue.
 */

import { test, expect } from '../../../fixtures/auth-painel.fixture.js';
import { ConfiguracoesPage } from '../../../pages/painel/ConfiguracoesPage.js';
import { KYCJornadaPage } from '../../../pages/painel/KYCJornadaPage.js';

// ============================================================
// SMOKE — Fluxo Risco Zero (ativo)
// ============================================================

test.describe('Configuração da Jornada KYC — Painel', () => {

  test('deve acessar a página de Configurações', async ({ page }) => {
    const config = new ConfiguracoesPage(page);
    await config.goto();
    await expect(config.pageTitle).toBeVisible();
    await expect(config.configurarJornadaKYCButton).toBeVisible();
  });

  test('deve navegar para Configurar Jornada KYC ao clicar no botão', async ({ page }) => {
    const config = new ConfiguracoesPage(page);
    await config.goto();
    await config.abrirJornadaKYC();
    await expect(page).toHaveURL(/\/configuracoes\/jornada/);
  });

  test('deve exibir os 3 presets de configuração', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    await expect(kyc.presetConversaoAlta).toBeVisible();
    await expect(kyc.presetEquilibrio).toBeVisible();
    await expect(kyc.presetRiscoZero).toBeVisible();
  });

  test('deve selecionar preset Risco Zero e alterar tentativas máximas para 2', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    await kyc.selecionarPreset('risco-zero');
    const tentativas = await kyc.getTentativasMaximas();
    expect(tentativas).toBe('2');
  });

  test('deve ativar validação Telefone ao selecionar Risco Zero', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    await kyc.selecionarPreset('risco-zero');
    const ativo = await kyc.isSwitchAtivo('Telefone');
    expect(ativo).toBe(true);
  });

  test('deve exibir o botão Salvar Configurações', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    await expect(kyc.salvarButton).toBeVisible();
  });

  test('deve salvar configuração Risco Zero sem erro', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    await kyc.selecionarPreset('risco-zero');
    await kyc.salvarConfiguracoes();
    // Aguarda toast de sucesso ou ausência de erro
    // Toast não tem seletor fixo mapeado — verificamos que a URL não muda para erro
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/configuracoes\/jornada/);
  });

  test('deve exibir histórico de alterações na página', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    await expect(kyc.historicoSection).toBeVisible();
  });

});

// ============================================================
// CENÁRIOS DETALHADOS — test.skip (ativar conforme task #269 for entregue)
// ============================================================

test.describe('KYC — Switches de Validação @skip', () => {

  test.skip('deve exibir 8 validações disponíveis', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    const switches = page.locator('[role="switch"]');
    await expect(switches).toHaveCount(8);
  });

  test.skip('deve ativar todas as validações com preset Risco Zero', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    await kyc.selecionarPreset('risco-zero');
    const validacoes = ['OCR', 'Biometria Facial', 'Checagem Face', 'Consultas', 'Device', 'E-mail', 'Telefone'];
    for (const v of validacoes) {
      expect(await kyc.isSwitchAtivo(v)).toBe(true);
    }
  });

  test.skip('deve desativar Doclink com preset Risco Zero (estado observado no DOM)', async ({ page }) => {
    // Doclink estava aria-checked="false" com Risco Zero no staging em 16/06/2026
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    await kyc.selecionarPreset('risco-zero');
    expect(await kyc.isSwitchAtivo('Doclink')).toBe(false);
  });

  test.skip('deve permitir toggle manual de switch individual', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    const estadoAntes = await kyc.isSwitchAtivo('OCR');
    await kyc.switchOCR.click();
    const estadoDepois = await kyc.isSwitchAtivo('OCR');
    expect(estadoDepois).toBe(!estadoAntes);
  });

  test.skip('deve respeitar limite de tentativas entre 1 e 30', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    await kyc.tentativasMaximasInput.fill('0');
    await kyc.salvarButton.click();
    // Esperado: mensagem de erro de validação (seletor a mapear quando feature for entregue)
    await expect(page.getByText('Informe um valor entre 1 e 30')).toBeVisible();
  });

  test.skip('deve persistir configuração salva no histórico de alterações', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    await kyc.selecionarPreset('risco-zero');
    await kyc.salvarConfiguracoes();
    // Aguarda toast e verifica que histórico exibe "Risco Zero"
    await expect(page.getByText('Risco Zero')).toBeVisible();
  });

  test.skip('deve navegar de volta para Configurações ao clicar em Voltar', async ({ page }) => {
    const kyc = new KYCJornadaPage(page);
    await kyc.goto();
    await kyc.voltarButton.click();
    await expect(page).toHaveURL(/\/configuracoes$/);
  });

  test.skip('Telefone — deve exibir campo com seletor de país (flag)', async ({ page }) => {
    // Cenário específico task #269: campo telefone com country picker
    // A ser implementado quando a tela de envio de telefone estiver em staging
    throw new Error('Não implementado — aguarda entrega da task #269');
  });

  test.skip('Telefone — deve aplicar máscara conforme DDI selecionado', async ({ page }) => {
    throw new Error('Não implementado — aguarda entrega da task #269');
  });

  test.skip('Telefone — deve rejeitar número fora do formato do país selecionado', async ({ page }) => {
    throw new Error('Não implementado — aguarda entrega da task #269');
  });

});
