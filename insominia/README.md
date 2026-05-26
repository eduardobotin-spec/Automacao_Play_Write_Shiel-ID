# Insomnia — Shield-ID Consultas API

## Como importar

1. Abra o Insomnia
2. **Application → Preferences → Data → Import Data → From File**
3. Selecione `shield-id-insomnia.json`
4. O workspace **Shield-ID - Consultas API** será criado

## Configuração inicial

1. Vá em **Environment** (canto superior direito) e selecione o ambiente **Staging**
2. Clique no ícone de olho → **Manage Environments** → **Staging**
3. Preencha:

```json
{
  "api_user": "seu_api_user",
  "api_pass": "seu_api_pass"
}
```

4. Clique **Done**

## Estrutura das pastas

```
📁 1 - Consultas por CPF (Fornecedores Externos)      → 18 cenários
📁 2 - Cache Replay                                    → 7 cenários
📁 3 - CNH                                             → 10 cenários
📁 4 - Financeiro                                      → 4 cenários
📁 5 - Perfis CPF                                      → 4 cenários
📁 6 - Veículo                                         → 3 cenários
📁 7 - Biometria                                       → 10 cenários (3 requests cada)
```

## Como usar

### Collections 1 a 6

Basta selecionar a request e clicar **Send**. Cada request já contém:
- URL correta com variáveis de ambiente
- Autenticação Basic Auth (herdada)
- Body com `consultType` específico

### Collection 7 - Biometria

Cada cenário tem **3 requests** que devem ser executadas em ordem:

| Passo | Request | Descrição |
|-------|---------|-----------|
| 1 | `01 - NB00X - Gerar Hash` | Gera hash da consulta. Envie primeiro. |
| 2 | `02 - NB00X - Enviar Biometria` | Envia 6 imagens faciais. Anexe os arquivos MANUALMENTE. |
| 3 | `03 - NB00X - Polling Status` | Consulta o status até finalizar. |

Os passos 2 e 3 usam **Response Chaining** do Insomnia para reaproveitar automaticamente o `hash` e `task_id` das respostas anteriores.

#### Anexar imagens da Biometria (Passo 2)

1. Selecione a request `02 - NB00X - Enviar Biometria`
2. Vá na aba **Body** → **Multipart**
3. Para cada campo `files`, clique em **Select File** e escolha a imagem correspondente:

| Campo | Arquivo esperado |
|-------|-----------------|
| files 1 | `CENTER_1.png` |
| files 2 | `CENTER_2.png` |
| files 3 | `CENTER_3.png` |
| files 4 | `CENTER_4.png` |
| files 5 | `CENTER_5.png` |
| files 6 | `CENTER_6.png` |

As imagens estão no projeto de automação em:
```
biometria/<biometriaId>/
```

Exemplo: `biometria/CA001_APROVADO/CENTER_1.png`

## Variáveis de Ambiente disponíveis

| Variável | Descrição |
|----------|-----------|
| `base_url` | `https://shielid-staging.com` |
| `kyc_url` | `https://kyc.shielid-staging.com` |
| `api_user` | Seu usuário da API (preencher) |
| `api_pass` | Sua senha da API (preencher) |
| `tenant_id` | `D7n4g9InxXWV52UE` |
| `cpf_ca001` .. `cpf_ca020` | CPFs dos cenários de consulta |
| `cpf_cnh002`, `cpf_cnh007..010` | CPFs específicos para CNH |
| `cpf_ps002..ps004` | CPFs para perfis |
| `placa_vcl001..vcl003` | Placas para consulta de veículo |

## Observações

- As collections **1 a 6** não incluem validações de banco (apenas chamadas de API)
- A collection **7 (Biometria)** requer que as imagens estejam disponíveis localmente
- O Response Chaining funciona apenas se as requests forem executadas em ordem (1 → 2 → 3)
