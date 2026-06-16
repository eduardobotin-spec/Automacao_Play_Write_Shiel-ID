# Critério de Aceite — QA Módulo Financeiro

## 1. Onboarding + Contrato (Clicksign)

1. Cliente criado → contrato gerado automaticamente com dados preenchidos
2. Contrato enviado ao Clicksign → status sistema = "pendente_assinatura"
3. Assinatura completa → cliente consegue fazer login
4. Dados obrigatórios faltando → rejeita com erro claro
5. Criar 10 clientes ao mesmo tempo → todos são salvos corretamente (sem falhas)

## 2. Flexibilizar Preços

1. Preço padrão aplicado quando cliente não tem customizado
2. Preço customizado sobrescreve padrão
3. Múltiplos serviços respeitam preços individuais
4. Preço abaixo do mínimo → validação rejeita
5. Mudança de preço future-dated → não afeta faturas passadas

## 3. Dashboard Financeiro

1. Lista de clientes ativos com consumo do mês
2. Filtro por status (ativo, cancelado, inadimplente) funciona
3. Dados mostram atualizados em tempo real (máximo 5 segundos de atraso)
4. Exportar para Excel → arquivo abre corretamente e dados batem
5. Responsivo em celular (375px) → sem conteúdo cortado

## 4. Gateway de Pagamento

1. Fatura gerada → link de pagamento criado automaticamente
2. Link enviado por e-mail com sucesso
3. Múltiplos métodos disponíveis (Pix, Boleto, Cartão)
4. Webhook recebido → status fatura muda para "pago"
5. Receber mesmo webhook 2x → ignora a segunda (não cria 2 pagamentos)
6. Gateway indisponível → mostra erro ao usuário e tenta novamente automaticamente
7. Gerar 100 links simultaneamente → cada um leva menos de 500ms

## 5. Conciliação Bancária

1. Depósito bancário identificado → fatura baixada automaticamente
2. Depósito parcial → sincroniza com gateway sem contar em duplicado
3. Depósito sem cliente identificado → marca como "não conciliado", alerta humano
4. Banco mostra R$ 999, gateway mostra R$ 1.000 → detecta diferença e avisa
5. Relatório diário mostra faturado vs recebido vs em aberto

## 6. Alertas Inadimplência

1. Fatura vence hoje → após 1 dia sem pagar, envia e-mail cobrança
2. Fatura com 7 dias de atraso → envia segundo e-mail (tom mais firme)
3. Fatura com 15 dias de atraso → envia terceiro e-mail, ameaça bloquear
4. Fatura com 30 dias de atraso → cliente é bloqueado, não consegue logar
5. Cliente paga atrasado → acesso é restaurado automaticamente
6. Dashboard filtro inadimplente → mostra clientes com atraso maior que 7 dias

## 7. Comissões

1. Comissão calculada corretamente de acordo com % configurada
2. Múltiplos representantes por cliente → cada um recebe seu % correto
3. Cliente em atraso → comissão não é paga agora (fica retida)
4. Cliente paga atraso → comissão retida é liberada
5. Relatório mensal por representante mostra: quanto faturou, quanto recebeu, comissão bruta, o que foi retido, valor final

## 8. Relatórios e Exportação

1. Relatório "Faturamento Mensal" → PDF/Excel com totais corretos
2. Relatório "Recebimentos" → mostra data, cliente, valor, forma de pagamento
3. Relatório "Inadimplência" → clientes com atraso maior que 7 dias e valor em risco
4. Relatório "Comissões" → valores batem com cálculos do sistema
5. Exportação para ERP → arquivo estruturado (JSON/XML) pronto pra integração
6. Agendar relatório → configurar "enviar todo dia 1º" e sistema envia por e-mail automaticamente
7. Gerar relatório de 10 mil clientes em 12 meses → completa em menos de 60 segundos
