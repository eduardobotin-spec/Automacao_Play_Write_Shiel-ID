/**
 * Page Object — Detalhe do Cliente (/clientes/:id)
 *
 * Criado em 2026-06-16 para cobrir cenários pós-criação:
 * status do cliente, contrato, configurações financeiras, etc.
 *
 * ATENÇÃO: seletores ainda não mapeados (página não inspecionada).
 * Marcar como TODO e implementar quando a melhoria estiver entregue.
 */
export class ClientDetailPage {
  constructor(page) {
    this.page = page;
  }

  // ===== SELETORES (A MAPEAR após inspeção da página de detalhe) =====

  /** Status do cliente ex: "Ativo", "Pendente", "Suspenso" */
  get clientStatus() {
    // TODO: mapear após inspeção
    return this.page.locator('[data-testid="client-status"], [class*="status"]').first();
  }

  /** Status do contrato ex: "pendente_assinatura", "ativo" */
  get contractStatus() {
    // TODO: mapear após inspeção
    return this.page.locator('[data-testid="contract-status"], text=/contrato/i').first();
  }

  /** Seção financeira — preços configurados */
  get financialSection() {
    // TODO: mapear após inspeção
    return this.page.locator('[data-testid="financial-section"], text=/financeiro|preço/i').first();
  }

  // ===== MÉTODOS =====

  async goto(clientId) {
    await this.page.goto(`/clientes/${clientId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async getStatusText() {
    return await this.clientStatus.textContent();
  }

  async getContractStatusText() {
    return await this.contractStatus.textContent();
  }
}
