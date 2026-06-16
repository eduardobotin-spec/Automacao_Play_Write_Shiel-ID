/**
 * Page Object — Financeiro / Faturas (/financeiro/faturas)
 *
 * Seletores baseados em inspeção real do DOM em 2026-06-16.
 *
 * ESTADO ATUAL DA TELA (pré-módulo financeiro):
 *   - Rota: /financeiro/faturas?page=1&perPage=15
 *   - 4 cards de resumo: Total Faturado, Recebido, Pendente, Vencido (todos R$ 0,00)
 *   - Tabela vazia: "Nenhum resultado encontrado."
 *   - 3 filtros: período, representante, status
 *   - Sem botão de ação (ex: "Nova Fatura") ainda visível
 *
 * ATENÇÃO: esta tela será modificada pelos módulos financeiros (2, 3, 4, 6).
 * Ao quebrar, ajustar APENAS este arquivo.
 */
export class FaturasPage {
  constructor(page) {
    this.page = page;
  }

  // ===== SELETORES — NAVEGAÇÃO =====

  /** Botão do menu Financeiro (expande submenu) */
  get financeiroMenuButton() {
    return this.page.locator('button[aria-expanded]').filter({ hasText: /financeiro/i });
  }

  /** Link Faturas no submenu */
  get faturasMenuLink() {
    return this.page.locator('a[href="/financeiro/faturas"]');
  }

  // ===== SELETORES — CARDS DE RESUMO =====

  /** Container do card Total Faturado */
  get cardTotalFaturado() {
    return this.page.locator('span', { hasText: 'Total Faturado' }).locator('../..');
  }

  /** Container do card Recebido */
  get cardRecebido() {
    return this.page.locator('span', { hasText: 'Recebido' }).locator('../..');
  }

  /** Container do card Pendente */
  get cardPendente() {
    return this.page.locator('span', { hasText: 'Pendente' }).locator('../..');
  }

  /** Container do card Vencido */
  get cardVencido() {
    return this.page.locator('span', { hasText: 'Vencido' }).locator('../..');
  }

  // ===== SELETORES — FILTROS =====

  /** Filtro de período */
  get filtroPeriodo() {
    return this.page.locator('button[role="combobox"]').filter({ hasText: /selecione um período/i });
  }

  /** Filtro de representante */
  get filtroRepresentante() {
    return this.page.locator('button[role="combobox"]').filter({ hasText: /filtre por representante/i });
  }

  /** Filtro de status */
  get filtroStatus() {
    return this.page.locator('button[role="combobox"]').filter({ hasText: /filtre por status/i });
  }

  // ===== SELETORES — TABELA =====

  /** Tabela de faturas */
  get faturasTable() {
    return this.page.locator('table');
  }

  /** Linhas de dados */
  get faturasRows() {
    return this.page.locator('table tbody tr');
  }

  /** Mensagem de estado vazio */
  get emptyStateMessage() {
    return this.page.locator('text=Nenhum resultado encontrado.');
  }

  /** Seletor de linhas por página */
  get pageSizeCombobox() {
    return this.page.locator('button[role="combobox"]').filter({ hasText: /^\d+$/ });
  }

  // ===== SELETORES — AÇÕES (a mapear quando features forem entregues) =====
  // TODO: botão "Nova Fatura" — ainda não existe na tela
  // TODO: botão "Exportar" — ainda não existe na tela

  // ===== MÉTODOS =====

  async goto() {
    await this.page.goto('/financeiro/faturas?page=1&perPage=15');
    await this.page.waitForLoadState('networkidle');
  }

  async isTableVisible() {
    return await this.faturasTable.isVisible();
  }

  async getFaturasCount() {
    return await this.faturasRows.count();
  }

  async isEmptyStateVisible() {
    return await this.emptyStateMessage.isVisible();
  }

  /**
   * Filtra por status
   * @param {string} status - ex: "Pendente", "Pago", "Vencido"
   */
  async filterByStatus(status) {
    await this.filtroStatus.click();
    await this.page.getByRole('option', { name: status }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Filtra por representante
   * @param {string} representante
   */
  async filterByRepresentante(representante) {
    await this.filtroRepresentante.click();
    await this.page.getByRole('option', { name: representante }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Retorna o valor exibido em um card de resumo
   * @param {'Total Faturado'|'Recebido'|'Pendente'|'Vencido'} cardName
   */
  async getCardValue(cardName) {
    const card = this.page.locator('span', { hasText: cardName }).locator('../..');
    return await card.locator('text=/R\\$\\s*[\\d,.]+/').textContent();
  }
}
