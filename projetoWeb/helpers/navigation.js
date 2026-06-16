/**
 * Helper - Navegação
 * Funções reutilizáveis para navegar pela aplicação
 */

import { ClientsPage } from '../pages/ClientsPage.js';
import { CreateClientPage } from '../pages/CreateClientPage.js';

/**
 * Navega para a página de clientes
 * @param {Page} page - Página do Playwright
 */
export async function goToClients(page) {
  const clientsPage = new ClientsPage(page);
  await clientsPage.goto();
  await page.waitForLoadState('networkidle');
}

/**
 * Navega para a página de criar novo cliente
 * @param {Page} page - Página do Playwright
 */
export async function goToCreateClient(page) {
  const createClientPage = new CreateClientPage(page);
  await createClientPage.goto();
  await page.waitForLoadState('networkidle');
}

/**
 * Abre a página de criar cliente a partir da listagem
 * @param {Page} page - Página do Playwright
 */
export async function openNewClientFormFromList(page) {
  const clientsPage = new ClientsPage(page);
  await clientsPage.goto();
  await clientsPage.clickNewClient();
  await page.waitForLoadState('networkidle');
}
