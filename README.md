# Automacao_Play_Write_Shiel-ID

Projeto de automação de testes (Playwright + JMeter) para o sistema Shiel ID.

---

## Base de Conhecimento — Endpoints

### Gerar Hash KYC

**Endpoint principal (preferencial):**

```
POST https://shielid-staging.com/api/consultDocument?document={cpf}
Authorization: Basic <base64(apiUser:apiPass)>
Content-Type: application/json

Body:
{
  "consultType": "modulo1+modulo2+dados_cadastrais"
}
```

**Regra:** `dados_cadastrais` sempre ao final do `consultType`. Módulos extras ordenados alfabeticamente antes. Ex: `telefone+email+dados_cadastrais`.

**Endpoint fallback (legado)** — usado quando `consultDocument` não retorna hash:

```
POST https://shielid-staging.com/api/getNewHashKYC?documentExpected={cpf}
Authorization: Basic <base64(apiUser:apiPass)>
```

**Implementação:** `services/gerarHash.js`
