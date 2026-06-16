/**
 * Page Object — Lista de Clientes (/clientes)
 *
 * Seletores baseados em inspeção real do DOM em 2026-06-16.
 * ESTRATÉGIA: name > placeholder > texto visível > estrutura semântica.
 * IDs gerados dinamicamente (ex: «r4»-form-item) — NÃO usar.
 * Classes Tailwind/CSS-in-JS — NÃO usar como seletor primário.
 *
 * ATENÇÃO: a página ainda receberá melhorias (módulo financeiro).
 * Ao quebrar, ajustar APENAS este arquivo — os specs não devem conhecer seletores.
 */
export class ClientsPage {
  constructor(page) {
    this.page = page;
  }

  // ===== SELETORES =====

  /** Input de busca */
  get searchInput() {
    return this.page.locator('input[placeholder="Busque por nome ou documento"]');
  }

  /** Link para criar novo cliente (é um <a>, não <button>) */
  get newClientLink() {
    return this.page.locator('a[href="/clientes/criar"]');
  }

  /** Tabela de clientes */
  get clientsTable() {
    return this.page.locator('table');
  }

  /** Linhas de dados da tabela */
  get clientRows() {
    return this.page.locator('table tbody tr');
  }

  /** Filtro de tipo de conta */
  get typeFilterCombobox() {
    return this.page.locator('button[role="combobox"]').filter({ hasText: /todos os tipos/i });
  }

  /** Texto de paginação ex: "Mostrando 1 a 3 de 3 resultados" */
  get paginationText() {
    return this.page.locator('text=/Mostrando \\d+ a \\d+ de \\d+ resultado/');
  }

  /** Seletor de linhas por página */
  get pageSizeCombobox() {
    return this.page.locator('button[role="combobox"]').nth(1);
  }

  // ===== MÉTODOS =====

  async goto() {
    await this.page.goto('/clientes?search=&page=1&perPage=15');
    await this.page.waitForLoadState('networkidle');
  }

  async clickNewClient() {
    await this.newClientLink.click();
    await this.page.waitForURL('**/clientes/criar');
  }

  async search(query) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async getClientCount() {
    return await this.clientRows.count();
  }

  async isTableVisible() {
    return await this.clientsTable.isVisible();
  }

  async isNewClientLinkVisible() {
    return await this.newClientLink.isVisible();
  }

  async getPaginationText() {
    return await this.paginationText.textContent();
  }

  async filterByType(tipo) {
    await this.typeFilterCombobox.click();
    await this.page.getByRole('option', { name: tipo }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickClientByName(nome) {
    await this.page.locator('table tbody tr').filter({ hasText: nome }).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async getRowDataByName(nome) {
    const row = this.page.locator('table tbody tr').filter({ hasText: nome }).first();
    const cells = await row.locator('td').allTextContents();
    return cells.map(c => c.trim());
  }
}
