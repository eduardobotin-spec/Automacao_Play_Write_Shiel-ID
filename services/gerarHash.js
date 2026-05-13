import * as baseDados from './baseDados.js';

const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';

const MODULO_DADOS_CADASTRAIS = 'dados_cadastrais';

/**
 * Monta consultType no formato da API: "telefone+email+dados_cadastrais".
 * dados_cadastrais sempre no final.
 */
function montarConsultTypeDeModulos(modulos = []) {
  const list = Array.isArray(modulos) && modulos.length > 0 ? modulos : [MODULO_DADOS_CADASTRAIS];
  const set = new Set(
    list.map((item) => String(item ?? '').trim()).filter((s) => s.length > 0)
  );
  if (!set.has(MODULO_DADOS_CADASTRAIS)) set.add(MODULO_DADOS_CADASTRAIS);
  const extras = [...set].filter((m) => m !== MODULO_DADOS_CADASTRAIS);
  extras.sort();
  return [...extras, MODULO_DADOS_CADASTRAIS].join('+');
}

/** Garante dados_cadastrais no final (regra de negócio). */
function normalizarConsultType(consultType) {
  const partes = String(consultType ?? '')
    .split('+')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const set = new Set(partes);
  if (!set.has(MODULO_DADOS_CADASTRAIS)) set.add(MODULO_DADOS_CADASTRAIS);
  const extras = [...set].filter((m) => m !== MODULO_DADOS_CADASTRAIS);
  extras.sort();
  return [...extras, MODULO_DADOS_CADASTRAIS].join('+');
}

export async function gerarHash(request, cenario = 'CA001', options = {}) {
  const authUser = String(options?.clientAuth?.apiUser ?? apiUser).trim();
  const authPass = String(options?.clientAuth?.apiPass ?? apiPass).trim();
  const authHeader = `Basic ${Buffer.from(`${authUser}:${authPass}`).toString('base64')}`;

  const cpfFromBase = baseDados[cenario];
  const isCpfLiteral = typeof cenario === 'string' && /^\d{11}$/.test(cenario);
  const cpf = cpfFromBase ?? (isCpfLiteral ? cenario : undefined);
  const modulos = Array.isArray(options?.modulos)
    ? options.modulos.filter((item) => typeof item === 'string' && item.trim() !== '')
    : [];

  const consultTypeExplicito =
    typeof options?.consultType === 'string' ? options.consultType.trim() : '';
  const consultType = normalizarConsultType(
    consultTypeExplicito !== '' ? consultTypeExplicito : montarConsultTypeDeModulos(modulos)
  );

  if (cpf == null || cpf === '') {
    throw new Error(`gerarHash: cenário inválido ou sem CPF: ${cenario}`);
  }

  const url = `https://shielid-staging.com/api/consultDocument?document=${encodeURIComponent(cpf)}`;

  const response = await request.post(url, {
    headers: {
      Authorization: authHeader,
    },
    data: {
      consultType,
    },
  });

  const body = await response.json();

  const d = body?.data && typeof body.data === 'object' ? body.data : null;
  let hash =
    body?.hash ??
    d?.hash ??
    body?.hash_checker ??
    d?.hash_checker ??
    body?.transaction_hash ??
    d?.transaction_hash;
  const urlKyc = body?.url ?? body?.redirectUrl ?? d?.url;
  if (!hash && urlKyc) {
    hash = urlKyc.split('/').pop().split('?')[0];
  }

  // Fallback de compatibilidade:
  // consultDocument pode responder sem hash de sessão.
  // Nesse caso, criamos a hash no endpoint legado apenas para manter
  // o fluxo atual de extrações por hash (DB/log/PDF) sem quebrar os testes.
  if (!hash) {
    const responseHash = await request.post(
      `https://shielid-staging.com/api/getNewHashKYC?documentExpected=${cpf}`,
      {
        headers: {
          Authorization: authHeader,
        },
      }
    );

    const bodyHash = await responseHash.json();
    const dHash = bodyHash?.data && typeof bodyHash.data === 'object' ? bodyHash.data : null;
    hash = bodyHash?.hash ?? dHash?.hash;
    const urlHash = bodyHash?.url ?? bodyHash?.redirectUrl ?? dHash?.url;
    if (!hash && urlHash) {
      hash = urlHash.split('/').pop().split('?')[0];
    }
  }

  if (hash == null || hash === '') {
    const det = body?.detail ?? body?.message;
    const msg = typeof det === 'string' ? det : JSON.stringify(body);
    throw new Error(`gerarHash: resposta sem hash (HTTP ${response.status()}). ${msg}`);
  }

  return {
    hash,
    hash_checker: body?.hash_checker ?? d?.hash_checker,
    cpf,
  };
}
