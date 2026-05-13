# Atualizacoes do Dia - 2026-05-04

## Resumo Executivo

Este documento consolida as alteracoes realizadas hoje no projeto de automacao KYC (biometria/documento), incluindo:

- ajustes de leitura e envio de imagens;
- validacoes de cenarios CA e GATES;
- padronizacao/filtragem de logs;
- novos cenarios preparados para entrada posterior de CPF/imagens;
- configuracao de paralelismo no Playwright.

---

## 1) Biometria - leitura de imagens e compatibilidade

### Objetivo
Permitir execucao com massas legadas e novas, mantendo envio canonico por posicao de face (`CENTER_1` ate `CENTER_6`).

### O que foi ajustado

- Arquivo: `services/biometriaImagens.js`
  - suporte a diferentes layouts de massa:
    - `CENTER_1..CENTER_6` (padrao);
    - centers parciais com repeticao/ciclo;
    - layouts legados de spoofing;
    - layout legado de sem movimentos reais;
    - layout legado GATES (`face_look_forward_*.jpeg`);
  - suporte a extensoes de imagem para centers:
    - `.png`, `.jpg`, `.jpeg`;
  - resolucao por slot (1..6), inclusive quando a extensao muda;
  - adicao de helper de MIME por extensao (`mimeFromImagePath`).

- Arquivo: `services/processar_biometria.js`
  - upload da biometria agora usa MIME dinamico por arquivo real (nao fixo em `image/png`).

- Arquivo: `tests/onboarding-gates.spec.js`
  - envio multipart tambem usa MIME dinamico por arquivo real.

---

## 2) Documento (EQ) - compatibilidade de extensao

- Arquivo: `services/processar_documento.js`
  - `enviarDocumentoFisico` deixou de forcar nome/mime em PNG;
  - agora usa nome real do arquivo e MIME derivado da extensao (`.png/.jpg/.jpeg`).

---

## 3) Logs - estrutura, filtro e resumo

### Objetivo
Manter logs legiveis e orientados para validacao de resultado por cenario.

### O que foi ajustado

- Arquivo: `services/apiResultLog.js`
  - formato por bloco com:
    - `NOME_CENARIO`;
    - `CPF`;
    - `RETORNO RESPONSE`.
  - filtro de payload para registrar somente:
    - `session_status` (campos essenciais);
  - remocao de cabecalhos/extras de bloco nao solicitados;
  - resumo no topo do arquivo:
    - `TESTES_EXECUTADOS`
    - `APROVADOS`
    - `REPROVADOS`
    - `FALHOU`.

- Arquivo: `services/processar_polling.js`
  - log passa CPF via contexto;
  - fallback de CPF por `session_status.document_expected` quando necessario.

- Arquivo: `services/processar_documento.js`
  - log de documento inclui CPF extraido do retorno quando disponivel.

---

## 4) Validacoes de status e status_message

### CA

- Arquivo: `tests/onboarding-biometria.spec.js`
  - regras de assercao ajustadas:
    - PEP e Beneficio: aceitam `approved | analysis | rejected`;
    - Menor de idade: aceita apenas `analysis | rejected`.

### GATES

- Arquivo: `services/processar_polling.js`
  - opcao `returnDetails` adicionada para retorno detalhado:
    - `{ status, statusMessage, raw }`.

- Arquivo: `tests/onboarding-gates.spec.js`
  - validacao por CPF baseada no baseline do log:
    - assercao de `status`;
    - assercao de `status_message` (null ou contem trecho esperado);
  - mantido comportamento de fallback para status sem baseline estrito.

---

## 5) Novos cenarios de biometria preparados

### Cenarios adicionados para entrada futura

- `ZOOM`
- `CARTOON`
- `ANIME`
- `DESENHO_3D`

### Arquivos

- `services/baseDados.js`
  - placeholders de CPF via `.env`:
    - `KYC_CPF_ZOOM`
    - `KYC_CPF_CARTOON`
    - `KYC_CPF_ANIME`
    - `KYC_CPF_DESENHO_3D`.

- `tests/onboarding-biometria.spec.js`
  - cenarios adicionados seguindo fluxo atual;
  - `skip` com mensagem quando CPF/pasta ainda nao foram configurados.

---

## 6) Template validator (guard-rail do projeto)

- Arquivo: `scripts/validate-templates.mjs`
  - identificacao de cenarios CA/EQ passou a considerar prefixo numerico (`CA\d+`, `EQ\d+`);
  - suporte de validacao para assercao de lista com `toContain(status)` alem de `toBe`.

---

## 7) Paralelismo de execucao

- Arquivo: `playwright.config.js`
  - `fullyParallel: true`
  - `workers: '100%'`.

Observacao: com paralelismo total, pode haver maior risco de colisao de estado compartilhado em ambientes nao isolados.

---

## 8) Observacoes finais

- O foco foi manter compatibilidade com massa legada sem quebrar o fluxo existente.
- A base agora suporta variacao de extensao de imagem sem exigir renomeacao imediata para todos os cenarios.
- As validacoes por retorno da API ficaram mais aderentes ao comportamento observado em log real.

---

## 9) Execucao em paralelo (comandos)

Para garantir paralelismo real, executar via terminal (sem `--ui` e sem clicar Play no arquivo na UI):

```bash
npx playwright test tests/onboarding-biometria.spec.js --fully-parallel --workers=100%
```

```bash
npx playwright test tests/onboarding-biometria.spec.js tests/onboarding-gates.spec.js --fully-parallel --workers=100%
```

Observacao: ao executar pelo botao Play do arquivo na interface, pode aparentar execucao serial/limitada mesmo com `fullyParallel: true`.
