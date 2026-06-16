/**
 * Helper — Autenticação
 */

import { LoginPage } from '../pages/shared/LoginPage.js';

/**
 * Realiza login e aguarda o dashboard carregar.
 *
 * Assinaturas aceitas:
 *   login(page, email, password)                          — admin (baseURL do config)
 *   login(page, { baseURL, email, password })             — painel (URL absoluta)
 */
export async function login(page, emailOrOptions, password) {
  let email, baseURL;
  if (typeof emailOrOptions === 'object') {
    ({ baseURL, email, password } = emailOrOptions);
  } else {
    email = emailOrOptions;
  }

  const loginPage = new LoginPage(page);
  if (baseURL) {
    await page.goto(`${baseURL}/login?redirect=%2Fdashboard`);
  } else {
    await loginPage.goto();
  }
  await loginPage.login(email, password);
  // Aguarda redirecionar para dashboard após login
  await page.waitForURL('**/dashboard', { timeout: 20000 });
}

/**
 * Verifica se o usuário está autenticado verificando a URL atual
 */
export async function isAuthenticated(page) {
  try {
    const url = page.url();
    return !url.includes('/login');
  } catch {
    return false;
  }
}

/**
 * Logout via limpeza de cookies/storage
 */
export async function logout(page) {
  await page.context().clearCookies();
  await page.context().clearPermissions();
}
