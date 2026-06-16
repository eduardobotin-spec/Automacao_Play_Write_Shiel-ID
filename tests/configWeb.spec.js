import { test, expect } from '@playwright/test';


const URL =  'https://painel.shielid-staging.com/login?redirect=%2Fdashboard';

const EMAIL = process.env.ADMIN_EMAIL || 'zugote88@gmail.com';
const PASSWORD = process.env.ADMIN_PASS || '123456';


test.beforeEach('Login Dashboard', async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole('textbox', { name: 'E-mail' })).toBeVisible();
  await page.getByRole('textbox', { name: 'E-mail' }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Senha' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole('heading', { name: 'Dashboard' })
  ).toBeVisible();
});

test('acessarConfiguracoes', async ({ page }) => {
  await page.getByText('Testes Automatizados').first().click();
  await page.getByRole('button', { name: 'configurações' }).click();
  await expect(page).toHaveURL(/configuracoes|settings|config/i);
});