import { test, expect } from '@playwright/test';


const URL =  'https://painel.shielid-staging.com/login?redirect=%2Fdashboard';

//LOGIN ADMIN
const EMAIL = 'zugote88@gmail.com';
const PASSWORD = '123456';


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
  await page.getByRole('texto', { name: 'Testes Automatizados' }).click();
  await page.getByRole('button', { name: 'configurações' }).click();

});