# Cenários Gherkin — QA Módulo Financeiro

## 1. Onboarding + Contrato (Clicksign)

```gherkin
Feature: Onboarding de cliente com geração de contrato

Scenario: Criar cliente e gerar contrato automaticamente
  Given que o comercial acessa a tela de novo cliente
  When preenche nome, CNPJ, e-mail e clica "Criar"
  Then o cliente é salvo no sistema
  And o contrato é gerado automaticamente com dados preenchidos
  And o status do contrato é "pendente_assinatura"

Scenario: Validar dados obrigatórios
  Given que o comercial tenta criar cliente
  When deixa e-mail em branco
  Then a validação rejeita
  And mostra mensagem de erro "E-mail obrigatório"

Scenario: Receber webhook de assinatura Clicksign
  Given que um contrato foi enviado ao Clicksign
  When Clicksign dispara webhook com status = "assinado"
  Then o sistema marca contrato como "ativo"
  And o cliente consegue fazer login
```

---

## 2. Flexibilizar Preços

```gherkin
Feature: Configuração flexible de preços por cliente

Scenario: Aplicar preço padrão
  Given que um cliente é criado sem preço customizado
  When a fatura é gerada
  Then usa o preço padrão do serviço

Scenario: Sobrescrever com preço customizado
  Given que um cliente tem preço customizado = R$ 5.000
  When a fatura é gerada
  Then mostra R$ 5.000
  And não usa o preço padrão

Scenario: Rejeitar preço abaixo do mínimo
  Given que tento salvar preço abaixo do mínimo configurado
  When clico "Salvar"
  Then a validação rejeita
  And mostra "Preço não pode ser menor que R$ XXX"

Scenario: Mudança future-dated não afeta faturas passadas
  Given que mudo o preço do cliente a partir de 01/07
  When faturas de 01/06 a 30/06 já foram geradas
  Then mantêm o preço antigo
  And apenas faturas futuras usam o novo preço
```

---

## 3. Dashboard Financeiro

```gherkin
Feature: Dashboard unificado de financeiro

Scenario: Listar clientes ativos com consumo
  Given que acesso o dashboard
  When a página carrega
  Then mostra tabela com: nome cliente, status, consumo mês
  And dados são atualizados em tempo real (< 5s)

Scenario: Filtrar por status
  Given que acesso o dashboard
  When seleciono filtro "status" = "inadimplente"
  Then mostra apenas clientes com atraso > 7 dias
  And contagem de clientes atualiza

Scenario: Exportar para Excel
  Given que clico "Exportar"
  When arquivo Excel é gerado
  Then abre corretamente em programa de planilha
  And contém colunas: cliente, status, consumo, valor

Scenario: Responsividade mobile
  Given que acesso dashboard em celular (375px)
  When a página reflow
  Then não há overflow de conteúdo
  And botões são clicáveis (> 48px)
```

---

## 4. Gateway de Pagamento

```gherkin
Feature: Integração com gateway de pagamento

Scenario: Gerar link de pagamento
  Given que uma fatura é emitida
  When o sistema chama API do gateway
  Then link de pagamento é criado
  And armazenado no banco de dados

Scenario: Enviar link por e-mail
  Given que link foi criado
  When o sistema envia e-mail
  Then cliente recebe e-mail com link
  And link é clicável e funciona

Scenario: Receber webhook de pagamento
  Given que cliente paga via gateway
  When gateway dispara webhook com transaction_id
  Then sistema marca fatura como "pago"
  And status é atualizado no dashboard

Scenario: Ignorar webhook duplicado
  Given que webhook foi recebido 2x com mesmo transaction_id
  When sistema processa segundo webhook
  Then ignora duplicata
  And não cria 2 registros de pagamento

Scenario: Timeout do gateway
  Given que gateway demora > 30s
  When requisição faz timeout
  Then retorna erro controlado ao usuário
  And coloca em fila de retry automático
```

---

## 5. Conciliação Bancária

```gherkin
Feature: Conciliação automática com banco

Scenario: Identificar e baixar depósito
  Given que extrato bancário mostra depósito de cliente X
  When sistema processa o arquivo OFX/API
  Then fatura do cliente X é marcada como "conciliado"
  And status muda para "pago"

Scenario: Sincronizar depósito parcial
  Given que cliente pagou 50% via gateway
  And 50% via transferência bancária
  When sistema processa ambos
  Then não duplica pagamento
  And fatura mostra total recebido (100%)

Scenario: Alertar depósito sem identificação
  Given que banco retorna depósito mas sem referência de cliente
  When sistema não consegue identificar
  Then marca como "não_conciliado"
  And cria alerta para financeiro revisar

Scenario: Detectar descrepância de valor
  Given que gateway mostra R$ 1.000
  And banco mostra R$ 999 (taxa)
  When sistema processa
  Then detecta divergência
  And marca como "pendente_revisão"
```

---

## 6. Alertas Inadimplência

```gherkin
Feature: Alertas automáticos de inadimplência

Scenario: Alerta T+1 de vencimento
  Given que fatura vence hoje
  When passa 1 dia sem pagamento
  Then sistema envia e-mail de cobrança
  And marca status = "vencida_alertada"

Scenario: Alerta T+7
  Given que fatura está vencida há 7 dias
  When sistema dispara alerta
  Then envia segundo e-mail
  And tom é mais firme que primeiro alerta

Scenario: Suspensão automática T+30
  Given que cliente está com atraso > 30 dias
  When sistema detecta vencimento
  Then suspende acesso do cliente
  And cliente vê mensagem "Conta suspensa"

Scenario: Reativar após pagamento
  Given que cliente estava suspenso
  When cliente paga fatura atrasada
  Then acesso é restaurado automaticamente
  And consegue fazer login

Scenario: Filtrar inadimplentes
  Given que acesso dashboard
  When seleciono filtro "status" = "inadimplente"
  Then mostra clientes com atraso > 7 dias
  And lista contém: nome, dias de atraso, valor devido
```

---

## 7. Comissões

```gherkin
Feature: Cálculo automático de comissões

Scenario: Calcular comissão sobre faturado
  Given que cliente A foi faturado em R$ 10.000
  And representante B tem 5% de comissão
  When mês fecha
  Then comissão = R$ 500

Scenario: Calcular sobre recebido
  Given que gateway recebeu apenas R$ 8.000
  And regra de comissão é "sobre recebido"
  When cálculo roda
  Then comissão = R$ 400

Scenario: Split entre múltiplos representantes
  Given que cliente tem split: rep A (60%), rep B (40%)
  When faturamento = R$ 10.000
  Then rep A recebe comissão sobre R$ 6.000
  And rep B recebe comissão sobre R$ 4.000

Scenario: Reter comissão por atraso
  Given que cliente está vencido > 30 dias
  And política de retenção está ativa
  When mês fecha
  Then comissão não é creditada
  And status = "retido"

Scenario: Liberar comissão após recebimento
  Given que comissão estava "retida"
  When cliente paga fatura atrasada
  Then comissão é creditada no representante
  And relatório mostra "liberado"
```

---

## 8. Relatórios e Exportação

```gherkin
Feature: Geração e exportação de relatórios

Scenario: Relatório de faturamento mensal
  Given que seleciono período 01/06 a 30/06
  When clico "Gerar relatório"
  Then arquivo PDF/Excel é criado
  And contém: total faturado, por cliente, por serviço
  And soma total bate com dashboard

Scenario: Relatório de recebimentos
  Given que seleciono período
  When gero relatório
  Then mostra: data, cliente, valor, forma de pagamento, status
  And valores batem com conciliação bancária

Scenario: Relatório de inadimplência
  Given que gero relatório
  When período é selecionado
  Then lista clientes vencidos > 7 dias
  And mostra: dias de atraso, valor em risco

Scenario: Relatório de comissões
  Given que seleciono mês e representante
  When gero relatório
  Then mostra: faturado, recebido, comissão bruta, retenções, líquido
  And bate com cálculos do sistema

Scenario: Exportar para ERP
  Given que clico "Exportar integrações"
  When formato é selecionado (JSON/XML)
  Then arquivo estruturado é gerado
  And sem erros de encoding

Scenario: Agendamento de relatório
  Given que configuro "enviar faturamento todo dia 1º"
  When 1º dia do mês chega
  Then relatório é gerado automaticamente
  And enviado por e-mail

Scenario: Performance com grande volume
  Given que gero faturamento de 10k clientes em 12 meses
  When processamento roda
  Then completa em < 60 segundos
  And PDF/Excel é criado com sucesso
```
