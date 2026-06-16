# ProjetoWeb - Testes de Automação Playwright

Testes de automação E2E para a aplicação Shiel ID, focando na página de criação de clientes.

## Estrutura

```
projetoWeb/
├── fixtures/          # Fixtures Playwright (setup/teardown)
├── helpers/          # Funções reutilizáveis (auth, navigation, etc)
├── pages/            # Page Objects (encapsulamento de elementos e ações)
├── specs/            # Casos de teste (.spec.js)
├── config/           # Configurações (envs, dados de teste)
├── playwright.config.js
├── package.json
├── .env.example
└── README.md
```

## Instalação

```bash
npm install
```

## Configuração

1. Crie um arquivo `.env` baseado em `.env.example`:
```bash
cp .env.example .env
```

2. Configure as credenciais de teste:
```env
BASE_URL=https://admin.shielid-staging.com
LOGIN_EMAIL=eduardobotinshielid@gmail.com
LOGIN_PASSWORD=123456
```

## Executar Testes

```bash
# Modo headless (padrão)
npm test

# Com interface visual
npm run test:ui

# Com debug
npm run test:debug

# Com browser visível
npm run test:headed
```

## Visualizar Relatório

Após rodar testes:
```bash
npm run test:report
```

## Page Objects

Cada página tem um arquivo com:
- **Selectors**: Elementos da página armazenados como propriedades
- **Métodos**: Ações reutilizáveis (click, fill, submit, etc)

Exemplo:
```javascript
const loginPage = new LoginPage(page);
await loginPage.login(email, password);
```

## Fixtures

Fixtures pre-configuradas:
- `authenticatedPage`: Página com login automático antes do teste

Uso:
```javascript
test('meu teste', async ({ authenticatedPage }) => {
  // authenticatedPage já está logado
});
```

## Helpers

Funções reutilizáveis:
- `auth.js`: Login, logout, validação de sessão
- `navigation.js`: Navegação entre páginas

## Status

- ✅ Estrutura Playwright montada
- ✅ Page Objects base criados
- ✅ Helpers de autenticação e navegação
- ⏳ Mapeamento de elementos (página de criar cliente)
- ⏳ Cenários de teste (criar cliente, validações, etc)
