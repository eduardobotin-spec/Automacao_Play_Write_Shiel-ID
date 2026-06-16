/**
 * Page Object — Configuração da Jornada KYC
 * URL: painel.shielid-staging.com/configuracoes/jornada
 *
 * Mapeado em 16/06/2026 via DOM inspection no staging.
 *
 * ESTRUTURA DA PÁGINA:
 *   1. Presets de Configuração (3 cards clicáveis: DIV sem aria-selected)
 *      - "Conversão Alta" — Mínimo de validações
 *      - "Equilíbrio"     — Padrão balanceado
 *      - "Risco Zero"     — Máxima segurança
 *
 *   2. Limites da Jornada
 *      - input[type="number"] — único no form; valor muda por preset
 *        (Conversão Alta: 5, Equilíbrio: não testado, Risco Zero: 2)
 *
 *   3. Validações Disponíveis (8 switches role="switch")
 *      Sem id/name/aria-label — identificados por texto do card pai.
 *      Seletor: locator que contém o texto >> [role="switch"]
 *      Validações: OCR, Biometria Facial, Checagem Face, Consultas,
 *                  Device, E-mail, Telefone, Doclink
 *
 *   4. Ações
 *      - button "Testar Jornada"       — abre flow de teste
 *      - button "Salvar Configurações" — persiste; mostra toast de sucesso
 *
 *   5. Histórico de Alterações
 *      - Exibe última alteração com usuário, data, hora e preset salvo
 */
export class KYCJornadaPage {
  constructor(page) {
    this.page = page;
  }

  // ===== SELECTORS — Presets =====
  get presetConversaoAlta() {
    return this.page.locator('div').filter({ hasText: /^Conversão Alta/ }).first();
  }

  get presetEquilibrio() {
    return this.page.locator('div').filter({ hasText: /^Equilíbrio/ }).first();
  }

  get presetRiscoZero() {
    return this.page.locator('div').filter({ hasText: /^Risco Zero/ }).first();
  }

  // ===== SELECTORS — Limites =====
  get tentativasMaximasInput() {
    return this.page.locator('input[type="number"]');
  }

  // ===== SELECTORS — Switches de validação =====
  // Estratégia: localiza o card pelo texto e busca o switch dentro dele
  switchDe(nomeValidacao) {
    return this.page.locator(`div:has-text("${nomeValidacao}") [role="switch"]`).first();
  }

  get switchOCR()            { return this.switchDe('OCR'); }
  get switchBiometria()      { return this.switchDe('Biometria Facial'); }
  get switchChecagemFace()   { return this.switchDe('Checagem Face'); }
  get switchConsultas()      { return this.switchDe('Consultas'); }
  get switchDevice()         { return this.switchDe('Device'); }
  get switchEmail()          { return this.switchDe('E-mail'); }
  get switchTelefone()       { return this.switchDe('Telefone'); }
  get switchDoclink()        { return this.switchDe('Doclink'); }

  // ===== SELECTORS — Ações =====
  get salvarButton() {
    return this.page.getByRole('button', { name: 'Salvar Configurações' });
  }

  get testarJornadaButton() {
    return this.page.getByRole('button', { name: 'Testar Jornada' });
  }

  get voltarButton() {
    return this.page.getByRole('button', { name: 'Voltar' });
  }

  // ===== SELECTORS — Histórico =====
  get historicoSection() {
    return this.page.getByText('Histórico de Alterações');
  }

  get verHistoricoCompletoButton() {
    return this.page.getByRole('button', { name: 'Ver histórico completo' });
  }

  // ===== MÉTODOS =====
  async goto() {
    await this.page.goto('/configuracoes/jornada');
    await this.page.getByRole('heading', { name: 'Personalização da Jornada de Onboarding' }).waitFor({ state: 'visible', timeout: 15000 });
  }

  async selecionarPreset(preset) {
    const presets = {
      'conversao-alta': this.presetConversaoAlta,
      'equilibrio': this.presetEquilibrio,
      'risco-zero': this.presetRiscoZero,
    };
    const locator = presets[preset];
    if (!locator) throw new Error(`Preset desconhecido: ${preset}`);
    await locator.click();
  }

  async salvarConfiguracoes() {
    await this.salvarButton.click();
  }

  async isSwitchAtivo(nomeValidacao) {
    const sw = this.switchDe(nomeValidacao);
    const checked = await sw.getAttribute('aria-checked');
    return checked === 'true';
  }

  async getTentativasMaximas() {
    return await this.tentativasMaximasInput.inputValue();
  }
}
