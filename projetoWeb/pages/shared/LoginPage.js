/**
 * Page Object - Login
 * Encapsula todos os elementos e ações da página de login
 */
export class LoginPage {
  constructor(page) {
    this.page = page;
  }

  // ===== SELECTORS =====
  get emailInput() {
    return this.page.locator('input[type="email"]');
  }

  get passwordInput() {
    return this.page.locator('input[type="password"]');
  }

  get loginButton() {
    return this.page.locator('button[type="submit"]');
  }

  get errorMessage() {
    return this.page.locator('[role="alert"]');
  }

  // ===== MÉTODOS =====
  async goto() {
    await this.page.goto('/login?redirect=%2Fdashboard');
  }

  async fillEmail(email) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password) {
    await this.passwordInput.fill(password);
  }

  async clickLogin() {
    await this.loginButton.click();
  }

  async login(email, password) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  async isErrorVisible() {
    return await this.errorMessage.isVisible();
  }

  async getErrorText() {
    return await this.errorMessage.textContent();
  }
}
