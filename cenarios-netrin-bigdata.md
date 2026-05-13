# Consultas Netrin/BigData — Cenários de Teste (Documentação)

## 🧾 Título
Consultas Netrin/BigData — roteamento, fallback, normalização, preços e contratação

## 📌 Tipo de Fluxo
**BLOQUEADO (não-classificável como CA001/EQ001)**  
Motivo: os critérios abaixo descrevem **integração de fornecedores e regras de roteamento** (Receita/PEP/Sanções/Benefícios/Telefone/Endereço/Email, BigData, custo, fallback, normalização), e **não** um cenário de **biometria facial** (CA001) nem de **envio de documento** (EQ001).

## 🧠 Contexto do Cenário
Este conjunto de critérios trata de um fluxo sensível de **KYC (validação de identidade)**, porém no recorte de **consultas a fornecedores** (Netrin/BigData), com requisitos de:

- roteamento por menor custo,
- fallback automático,
- normalização de schema,
- regras de decisão por tipo de consulta,
- visibilidade/contratação de módulos,
- logging de custo/tempo/fornecedor,
- agrupamento inteligente de chamadas.

⚠️ Pela regra crítica do agente, **não é permitido inventar steps** nem criar estrutura fora dos templates **CA001 (biometria)** e **EQ001 (documento)**. Como o seu critério não especifica um cenário de biometria ou documento, a geração de testes Playwright no padrão CA/EQ fica bloqueada até existir um mapeamento explícito para um desses fluxos.

## ✅ Critério de Aceite (reescrito de forma estruturada)
- **Integrações de fornecedores**
  - Consultas individuais da Netrin integradas e funcionais: Receita Federal, PEP/Listas/Sanções, Impedidos de Apostar, Benefícios Governo, Telefone, Endereço, Email.
  - API da BigData integrada: `basic_data`, `kyc`, `social_assistance_extended`, `financial_data`, `online_betting_compliance`, `registration_data`.
- **Roteamento e resiliência**
  - Roteamento automático seleciona o fornecedor mais barato por tipo de consulta.
  - Fallback automático: se fornecedor primário falhar, consultar secundário sem intervenção manual.
  - Agrupamento inteligente: se cliente pedir múltiplas consultas que um fornecedor entrega em uma chamada, agrupar para otimizar custo.
- **Normalização e regras**
  - Normalização de resposta: retornar dados em schema único independente do fornecedor.
  - Regras de decisão no painel admin vinculadas ao tipo de consulta (não ao fornecedor).
- **Contratação e precificação**
  - Cliente pode contratar: Pacote Completo, Modular (à la carte) ou Bundle pré-configurado.
  - Grid de preços atualizada com novos módulos de consulta por cliente.
  - Módulos não contratados não aparecem nas regras de decisão do cliente.
  - Consulta pacote existente (Netrin R$0,23) continua funcionando para clientes já configurados.
- **Auditoria**
  - Log de cada consulta registra: fornecedor usado, custo, tempo de resposta, sucesso/fallback.

## 🔄 Fluxo do Cenário
**BLOQUEADO (não há um fluxo CA001/EQ001 explicitamente aplicável).**  
Para destravar, é necessário indicar **onde** essas consultas acontecem em relação ao KYC:

- Se as consultas são executadas dentro do **fluxo de biometria** (CA): o cenário precisa ser descrito como `gerarHash → biometria → polling`.
- Se as consultas são executadas dentro do **fluxo de documento** (EQ): o cenário precisa ser descrito como `gerarHash → envio de documento`.

## 📥 Dados Necessários (INPUT DO USUÁRIO)
Para gerar cenários automatizados sem inventar estrutura, preciso que você informe:

- **Qual template aplicar**: CA001 (biometria) ou EQ001 (documento).
- **Qual “tipo de consulta”** está sendo testado em cada cenário (ex.: Receita, PEP/Sanções, Benefícios, etc.).
- **Quais fornecedores participam do roteamento** por tipo (primário/secundário) e qual condição define “mais barato”.
- **Quais falhas devem disparar fallback** (ex.: HTTP 5xx, timeout, payload inválido, indisponibilidade).
- **Qual schema normalizado esperado** (campos mínimos e regras de merge/precedência).
- **Quais combinações de contratação** (Pacote Completo / Modular / Bundle) e o efeito esperado no painel/admin.
- **Quais campos devem existir no log** e quais valores esperados por cenário.

## ⚙️ Placeholders Utilizados
Como este documento ainda não pode derivar de CA001/EQ001 sem inventar fluxo, **placeholders de execução** ficam bloqueados.  
Quando você indicar CA ou EQ, eu aplico obrigatoriamente os placeholders:

- `{{CPF}}`
- `{{IMAGENS}}` (se CA001)
- `{{DOCUMENTO}}` (se EQ001)

## 🧪 Resultado Esperado
**BLOQUEADO para geração de teste automatizado CA/EQ**, mas os resultados esperados (em nível de requisito) são:

- Roteamento escolhe fornecedor mais barato por tipo de consulta.
- Fallback ocorre automaticamente ao falhar primário, usando secundário.
- Resposta normalizada segue schema único independentemente do fornecedor.
- Regras de decisão vinculam-se ao tipo de consulta (não ao fornecedor).
- Contratação controla visibilidade de módulos e regras no painel/admin.
- Clientes legados continuam com pacote existente (Netrin R$0,23).
- Logs registram fornecedor, custo, tempo, sucesso/fallback.
- Agrupamento reduz custo quando possível sem alterar resultado final.

---

## ✅ Próximo passo para eu criar “cenários de testes” no padrão do projeto (CA001/EQ001)
Envie **uma linha** escolhendo o template e um recorte de cenário por vez, por exemplo:

- **Template**: CA001  
  **Cenário**: “Fallback automático do primário (timeout) para secundário na consulta PEP durante onboarding biométrico”  
  **Esperado**: `expect(status).toBe("approved")` (ou outro status final, conforme seu critério)

ou

- **Template**: EQ001  
  **Cenário**: “Roteamento por menor custo para consulta Receita no onboarding de documento”  
  **Esperado**: `expect(docResponse.status()).toBe(200)` (mantendo o padrão do template)

