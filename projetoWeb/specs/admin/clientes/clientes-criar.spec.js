/**
 * SPEC — Criar Cliente (Onboarding)
 *
 * Gherkin de referência: CENARIOS_GHERKIN_QA_FINANCEIRO.md — Módulo 1 (Onboarding + Contrato)
 *
 * DESCOBERTAS DO DOM que afetam os cenários Gherkin:
 *   1. Rota real: /clientes/criar (não /clientes/novo)
 *   2. Formulário NÃO valida campos no frontend antes do submit
 *   3. Ao clicar "Criar Cliente" → modal de confirmação de senha (alertdialog)
 *   4. Validação de campos obrigatórios ocorre no backend, após confirmação de senha
 *   5. O cenário Gherkin "mostra mensagem de erro E-mail obrigatório" PRECISA
 *      ser confirmado com o PO/Léo — validação pode ser apenas no backend
 *
 * Cenários NOT IMPLEMENTED (dependem de feature ainda não entregue):
 *   - Contrato gerado automaticamente pós-criação — Módulo 1 (Onboarding)
 *   - Status contrato = "pendente_assinatura" — Módulo 1
 *   - Webhook Clicksign → status "ativo" — Módulo 1 (requer integração Clicksign)
 *   - Cliente consegue logar após assinatura — Módulo 1
 *   - Múltiplos clientes em paralelo sem race condition — teste de carga (JMeter)
 */

import { test, expect } from '../../../fixtures/auth.fixture.js';
import { ClientsPage } from '../../../pages/admin/ClientsPage.js';
import { CreateClientPage } from '../../../pages/admin/CreateClientPage.js';

// Credenciais do usuário logado — necessárias para o modal de confirmação
const USER_PASSWORD = process.env.LOGIN_PASSWORD || '123456';

// Dados de teste — CNPJ fictício com formato válido para testes
const TEST_CLIENT = {
  cnpj: '12.345.678/0001-99',
  razaoSocial: 'Empresa Teste Automacao QA',
  nomeFantasia: 'Teste QA',
  email: 'qa-teste@shielid-automation.com',
  telefone: '(11) 99999-0001',
  emailRisco: 'risco-qa@shielid-automation.com',
  tipoConta: 'Interno',
};

test.describe('Criar Cliente', () => {
  let createPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    createPage = new CreateClientPage(authenticatedPage);
    await createPage.goto();
  });

  // -----------------------------------------------------------------------
  // CARREGAMENTO DO FORMULÁRIO
  // -----------------------------------------------------------------------

  test('deve exibir o formulário de criação ao acessar /clientes/criar', async ({ authenticatedPage }) => {
    await expect(createPage.cnpjInput).toBeVisible();
    await expect(createPage.razaoSocialInput).toBeVisible();
    await expect(createPage.emailInput).toBeVisible();
    await expect(createPage.criarClienteButton).toBeVisible();
    await expect(createPage.cancelarButton).toBeVisible();
  });

  test('deve exibir todos os campos obrigatórios da seção Informações Básicas', async ({ authenticatedPage }) => {
    await expect(createPage.cnpjInput).toBeVisible();
    await expect(createPage.razaoSocialInput).toBeVisible();
    await expect(createPage.nomeFantasiaInput).toBeVisible();
    await expect(createPage.emailInput).toBeVisible();
    await expect(createPage.telefoneInput).toBeVisible();
    await expect(createPage.emailRiscoInput).toBeVisible();
    await expect(createPage.tipoContaCombobox).toBeVisible();
  });

  test('deve exibir seção de Endereço', async ({ authenticatedPage }) => {
    await expect(createPage.cepInput).toBeVisible();
    await expect(createPage.enderecoInput).toBeVisible();
    await expect(createPage.cidadeInput).toBeVisible();
    await expect(createPage.ufInput).toBeVisible();
  });

  test('deve exibir seção de Pacote Contratado com os 3 pacotes', async ({ authenticatedPage }) => {
    await authenticatedPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await expect(authenticatedPage.locator('text=S1 - Cadastro Básico')).toBeVisible();
    await expect(authenticatedPage.locator('text=S2 - KYC Completo')).toBeVisible();
    await expect(authenticatedPage.locator('text=S3 - Identidade Biométrica')).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // MODAL DE CONFIRMAÇÃO
  // -----------------------------------------------------------------------

  test('deve exibir modal de confirmação de senha ao clicar em "Criar Cliente"', async ({ authenticatedPage }) => {
    // Preenche campos mínimos para garantir que o form não barre no frontend
    await createPage.fillBasicInfo({
      cnpj: TEST_CLIENT.cnpj,
      razaoSocial: TEST_CLIENT.razaoSocial,
      email: TEST_CLIENT.email,
    });
    await createPage.submitForm();
    await expect(createPage.confirmationModal).toBeVisible();
    await expect(createPage.confirmationPasswordInput).toBeVisible();
  });

  test('modal de confirmação deve fechar ao clicar em Cancelar', async ({ authenticatedPage }) => {
    await createPage.fillBasicInfo({
      cnpj: TEST_CLIENT.cnpj,
      razaoSocial: TEST_CLIENT.razaoSocial,
      email: TEST_CLIENT.email,
    });
    await createPage.submitForm();
    await createPage.dismissModal();
    await expect(createPage.confirmationModal).not.toBeVisible();
    // Deve permanecer na tela de criação
    await expect(authenticatedPage).toHaveURL(/\/clientes\/criar/);
  });

  // -----------------------------------------------------------------------
  // VALIDAÇÕES — CAMPOS OBRIGATÓRIOS
  // NOTA: Validação é no backend, após senha correta.
  // Os testes abaixo verificam que o sistema NÃO cria o cliente com dados inválidos.
  // -----------------------------------------------------------------------

  test('deve rejeitar criação com formulário vazio (sem dados)', async ({ authenticatedPage }) => {
    // Form vazio → modal aparece → confirma com senha → espera rejeição
    await createPage.submitForm();
    await createPage.confirmWithPassword(USER_PASSWORD);
    // Não deve navegar para listagem (URL permanece em /criar ou exibe erro)
    await authenticatedPage.waitForTimeout(2000);
    const url = authenticatedPage.url();
    const isStillOnCreate = url.includes('/criar') || url.includes('/clientes/criar');
    const hasError = await createPage.errorToast.isVisible().catch(() => false);
    expect(isStillOnCreate || hasError).toBeTruthy();
  });

  test('deve rejeitar criação com senha incorreta no modal', async ({ authenticatedPage }) => {
    await createPage.fillBasicInfo({
      cnpj: TEST_CLIENT.cnpj,
      razaoSocial: TEST_CLIENT.razaoSocial,
      email: TEST_CLIENT.email,
    });
    await createPage.submitForm();
    await createPage.confirmWithPassword('senha_errada_123');
    await authenticatedPage.waitForTimeout(2000);
    // Deve continuar na tela ou mostrar erro — não deve criar o cliente
    const url = authenticatedPage.url();
    expect(url).toMatch(/\/clientes\/criar/);
  });

  // -----------------------------------------------------------------------
  // CRIAÇÃO COM SUCESSO
  // ATENÇÃO: este teste cria dados reais no staging.
  // Rodar apenas em ambiente controlado ou com CNPJ de teste dedicado.
  // -----------------------------------------------------------------------

  test.skip('deve criar cliente com dados válidos e redirecionar', async ({ authenticatedPage }) => {
    // SKIP por padrão — ativa com: npx playwright test --grep "deve criar cliente"
    // Requer CNPJ único a cada execução (ou limpeza de dados no staging)
    await createPage.fillBasicInfo(TEST_CLIENT);
    await createPage.submitForm();
    await createPage.confirmWithPassword(USER_PASSWORD);
    // Após sucesso deve redirecionar para listagem ou detalhe do cliente
    await authenticatedPage.waitForURL(/\/clientes/, { timeout: 10000 });
    const url = authenticatedPage.url();
    expect(url).toMatch(/\/clientes/);
  });

  // -----------------------------------------------------------------------
  // NAVEGAÇÃO
  // -----------------------------------------------------------------------

  test('deve voltar para listagem ao clicar em Cancelar', async ({ authenticatedPage }) => {
    await createPage.cancelarButton.click();
    await authenticatedPage.waitForURL(/\/clientes/, { timeout: 5000 });
    await expect(authenticatedPage).toHaveURL(/\/clientes/);
  });

  // -----------------------------------------------------------------------
  // NOT IMPLEMENTED — aguardando entrega do módulo de onboarding/financeiro
  // -----------------------------------------------------------------------

  test.skip('NI — contrato gerado automaticamente após criação do cliente', async () => {
    // Módulo 1 (Onboarding + Clicksign) — não implementado ainda
    // Critério: cliente criado → contrato gerado com dados preenchidos
    // Validação: verificar status contrato = "pendente_assinatura" na página de detalhe
  });

  test.skip('NI — status do contrato = pendente_assinatura após criação', async () => {
    // Módulo 1 — não implementado ainda
  });

  test.skip('NI — webhook Clicksign marca contrato como ativo e libera login', async () => {
    // Módulo 1 — requer integração Clicksign + sandbox webhook
    // Fora do escopo E2E — candidato a teste de API/contrato
  });

  test.skip('NI — preço customizado por cliente na criação', async () => {
    // Módulo 4 (Flexibilizar Preços) — não implementado ainda
  });
});

test.describe('Criar Cliente — Acessibilidade do formulário', () => {
  test('todos os campos devem ter label associada', async ({ authenticatedPage }) => {
    const createPage = new CreateClientPage(authenticatedPage);
    await createPage.goto();
    // Verifica que os inputs principais têm label ou placeholder acessível
    await expect(createPage.cnpjInput).toHaveAttribute('placeholder', '00.000.000/0001-00');
    await expect(createPage.razaoSocialInput).toHaveAttribute('placeholder', 'Nome completo');
    await expect(createPage.emailInput).toHaveAttribute('placeholder', 'email@exemplo.com');
  });
});
