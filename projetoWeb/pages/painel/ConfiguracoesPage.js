/**
 * Page Object — Configurações (painel.shielid-staging.com/configuracoes)
 *
 * Mapeado em 16/06/2026 via DOM inspection no staging.
 *
 * Seletores estáveis mapeados:
 *   - link de navegação lateral: a[href="/configuracoes"]
 *   - botão "Configurar Jornada KYC": button com texto "Configurar Jornada KYC"
 *   - campo Chave da API: input (primeiro dentro da seção Configurações Gerais)
 *   - campo Chave Secreta: segundo input na seção
 *   - botão "Alterar sua senha": button com texto "Alterar sua senha"
 */
export class ConfiguracoesPage {
  constructor(page) {
    this.page = page;
  }

  // ===== SELECTORS =====
  get navLink() {
    return this.page.locator('a[href="/configuracoes"]');
  }

  get pageTitle() {
    return this.page.getByRole('heading', { name: 'Configurações' });
  }

  get configurarJornadaKYCButton() {
    return this.page.getByRole('button', { name: 'Configurar Jornada KYC' });
  }

  get alterarSenhaButton() {
    return this.page.getByRole('button', { name: 'Alterar sua senha' });
  }

  // ===== MÉTODOS =====
  async goto() {
    await this.page.goto('/configuracoes');
    await this.pageTitle.waitFor({ state: 'visible', timeout: 15000 });
  }

  async abrirJornadaKYC() {
    await this.configurarJornadaKYCButton.click();
    await this.page.waitForURL('**/configuracoes/jornada', { timeout: 15000 });
  }
}
