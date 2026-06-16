/**
 * Page Object — Criar Cliente (/clientes/criar)
 *
 * Seletores baseados em inspeção real do DOM em 2026-06-16.
 *
 * DESCOBERTAS DO DOM (registradas aqui como referência):
 * - Rota real: /clientes/criar  (não /clientes/novo como suposto antes)
 * - "Criar Cliente" é um <button type="button">, não type="submit"
 * - Ao clicar "Criar Cliente", abre modal de confirmação de senha (alertdialog)
 * - Validação dos campos obrigatórios: acontece no backend após confirmação de senha
 * - IDs dos campos são gerados dinamicamente (React) — usar name= ou placeholder=
 * - Campos de preço por serviço têm name= com valor dinâmico (JWT-like) — usar label
 * - Comboboxes (Tipo de Conta, Representante, Empresa): <button role="combobox">
 * - Checkboxes de módulo KYC: <button role="checkbox"> (shadcn/ui)
 * - Pacotes contratados: cards clicáveis com texto "S1 - Cadastro Básico" etc.
 *
 * Seções do formulário:
 *   1. Informações Básicas — CNPJ, Razão Social, Nome Fantasia, E-mail, Telefone, E-mail de risco, Tipo de Conta
 *   2. Endereço — CEP, Endereço, Cidade, UF, País
 *   3. Representante Comercial — Representante, Empresa Responsável
 *   4. Pacote Contratado — S1, S2, S3
 *   5. Módulos de consulta — checkboxes de habilitação
 *   6. Precificação — campos de preço por serviço
 */
export class CreateClientPage {
  constructor(page) {
    this.page = page;
  }

  // ===== SELETORES — INFORMAÇÕES BÁSICAS =====

  get cnpjInput() {
    return this.page.locator('input[name="documentNumber"]');
  }

  get razaoSocialInput() {
    return this.page.locator('input[name="name"]');
  }

  get nomeFantasiaInput() {
    return this.page.locator('input[name="prettyName"]');
  }

  get emailInput() {
    return this.page.locator('input[name="email"]');
  }

  get telefoneInput() {
    return this.page.locator('input[name="phone"]');
  }

  get emailRiscoInput() {
    return this.page.locator('input[name="riskEmail"]');
  }

  /** Combobox "Tipo de Conta" — <button role="combobox"> com texto "Selecione o tipo..." */
  get tipoContaCombobox() {
    return this.page.locator('button[role="combobox"]').filter({ hasText: /selecione o tipo/i });
  }

  // ===== SELETORES — ENDEREÇO =====

  get cepInput() {
    return this.page.locator('input[name="cep"]');
  }

  get enderecoInput() {
    return this.page.locator('input[name="address"]');
  }

  get cidadeInput() {
    return this.page.locator('input[name="city"]');
  }

  get ufInput() {
    return this.page.locator('input[name="uf"]');
  }

  get paisInput() {
    return this.page.locator('input[name="country"]');
  }

  // ===== SELETORES — REPRESENTANTE =====

  get representanteCombobox() {
    return this.page.locator('button[role="combobox"]').filter({ hasText: /selecione um representante/i });
  }

  get empresaCombobox() {
    return this.page.locator('button[role="combobox"]').filter({ hasText: /selecione a empresa/i });
  }

  // ===== SELETORES — PACOTE CONTRATADO =====

  /** Card do pacote S1 - Cadastro Básico */
  get pacoteS1Card() {
    return this.page.locator('text=S1 - Cadastro Básico').locator('..');
  }

  /** Card do pacote S2 - KYC Completo */
  get pacoteS2Card() {
    return this.page.locator('text=S2 - KYC Completo').locator('..');
  }

  /** Card do pacote S3 - Identidade Biométrica */
  get pacoteS3Card() {
    return this.page.locator('text=S3 - Identidade Biométrica').locator('..');
  }

  // ===== SELETORES — AÇÕES =====

  /** Botão principal de submissão */
  get criarClienteButton() {
    return this.page.locator('button', { hasText: 'Criar Cliente' });
  }

  /** Botão cancelar (volta para listagem) */
  get cancelarButton() {
    return this.page.locator('button', { hasText: 'Cancelar' });
  }

  /** Botão voltar (seta no header) */
  get backButton() {
    return this.page.locator('a[href="/clientes"]').first();
  }

  // ===== SELETORES — MODAL DE CONFIRMAÇÃO =====

  /** Modal de confirmação de senha */
  get confirmationModal() {
    return this.page.locator('[role="alertdialog"]');
  }

  /** Input de senha dentro do modal */
  get confirmationPasswordInput() {
    return this.confirmationModal.locator('input[name="password"]');
  }

  /** Botão "Confirmar" dentro do modal */
  get confirmButton() {
    return this.confirmationModal.locator('button[type="submit"]');
  }

  /** Botão "Cancelar" dentro do modal */
  get cancelConfirmButton() {
    return this.confirmationModal.locator('button', { hasText: 'Cancelar' });
  }

  // ===== SELETORES — FEEDBACK =====

  /** Toast/alerta de sucesso */
  get successToast() {
    return this.page.locator('[role="status"], [data-sonner-toast], .sonner-toast').filter({ hasText: /sucesso|criado|cliente/i }).first();
  }

  /** Toast/alerta de erro */
  get errorToast() {
    return this.page.locator('[role="status"], [data-sonner-toast], .sonner-toast').filter({ hasText: /erro|falha|inválido/i }).first();
  }

  /** Mensagens de validação inline */
  get validationErrors() {
    return this.page.locator('[class*="form-message"], p[id*="form-item-message"]');
  }

  // ===== MÉTODOS =====

  async goto() {
    await this.page.goto('/clientes/criar');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Preenche os campos obrigatórios de informações básicas
   * @param {Object} data
   * @param {string} data.cnpj
   * @param {string} data.razaoSocial
   * @param {string} [data.nomeFantasia]
   * @param {string} data.email
   * @param {string} [data.telefone]
   * @param {string} [data.emailRisco]
   * @param {string} [data.tipoConta] - ex: "Interno", "Externo"
   */
  async fillBasicInfo(data) {
    if (data.cnpj)        await this.cnpjInput.fill(data.cnpj);
    if (data.razaoSocial) await this.razaoSocialInput.fill(data.razaoSocial);
    if (data.nomeFantasia) await this.nomeFantasiaInput.fill(data.nomeFantasia);
    if (data.email)       await this.emailInput.fill(data.email);
    if (data.telefone)    await this.telefoneInput.fill(data.telefone);
    if (data.emailRisco)  await this.emailRiscoInput.fill(data.emailRisco);
    if (data.tipoConta) {
      await this.tipoContaCombobox.click();
      await this.page.getByRole('option', { name: data.tipoConta }).click();
    }
  }

  /**
   * Preenche endereço
   */
  async fillAddress(data) {
    if (data.cep)      await this.cepInput.fill(data.cep);
    if (data.endereco) await this.enderecoInput.fill(data.endereco);
    if (data.cidade)   await this.cidadeInput.fill(data.cidade);
    if (data.uf)       await this.ufInput.fill(data.uf);
    if (data.pais)     await this.paisInput.fill(data.pais);
  }

  /**
   * Clica em "Criar Cliente" e aguarda o modal de confirmação
   */
  async submitForm() {
    await this.criarClienteButton.click();
    await this.confirmationModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Confirma o modal com a senha do usuário logado
   * @param {string} password
   */
  async confirmWithPassword(password) {
    await this.confirmationPasswordInput.fill(password);
    await this.confirmButton.click();
  }

  /**
   * Fluxo completo: preenche, submete e confirma
   * @param {Object} clientData - dados do cliente
   * @param {string} password - senha do usuário logado
   */
  async createClient(clientData, password) {
    await this.fillBasicInfo(clientData);
    if (clientData.address) await this.fillAddress(clientData.address);
    await this.submitForm();
    await this.confirmWithPassword(password);
  }

  /**
   * Verifica se o modal de confirmação está visível
   */
  async isConfirmationModalVisible() {
    return await this.confirmationModal.isVisible();
  }

  /**
   * Fecha o modal sem confirmar
   */
  async dismissModal() {
    await this.cancelConfirmButton.click();
    await this.confirmationModal.waitFor({ state: 'hidden', timeout: 3000 });
  }

  /**
   * Retorna todos os textos de erro de validação inline presentes na página
   */
  async getValidationErrorTexts() {
    const errors = await this.validationErrors.allTextContents();
    return errors.filter(e => e.trim().length > 0);
  }
}
