import * as baseDados from './baseDados.js';

const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';

export async function gerarHash(request, cenario = 'CA001', options = {}) {
  const authUser = String(options?.clientAuth?.apiUser ?? apiUser).trim();
  const authPass = String(options?.clientAuth?.apiPass ?? apiPass).trim();
  const authHeader = `Basic ${Buffer.from(`${authUser}:${authPass}`).toString('base64')}`;

  const cpfFromBase = baseDados[cenario];
  const isCpfLiteral = typeof cenario === 'string' && /^\d{11}$/.test(cenario);
  const cpf = cpfFromBase ?? (isCpfLiteral ? cenario : undefined);

  if (cpf == null || cpf === '') {
    throw new Error(`gerarHash: cenário inválido ou sem CPF: ${cenario}`);
  }

  // Cria sessão KYC via endpoint de onboarding (getNewHashKYC).
  // consultDocument é o endpoint da Consulta Manual — não pertence aqui.
  const responseHash = await request.post(
    `https://shielid-staging.com/api/getNewHashKYC?documentExpected=${cpf}`,
    {
      headers: {
        Authorization: authHeader,
      },
      timeout: 20000,
    }
  );

  const body = await responseHash.json();
  const d = body?.data && typeof body.data === 'object' ? body.data : null;
  let hash = body?.hash ?? d?.hash;
  const urlHash = body?.url ?? body?.redirectUrl ?? d?.url;
  if (!hash && urlHash) {
    hash = urlHash.split('/').pop().split('?')[0];
  }

  if (hash == null || hash === '') {
    const det = body?.detail ?? body?.message;
    const msg = typeof det === 'string' ? det : JSON.stringify(body);
    throw new Error(`gerarHash: resposta sem hash (HTTP ${responseHash.status()}). ${msg}`);
  }

  return {
    hash,
    hash_checker: body?.hash_checker ?? d?.hash_checker,
    cpf,
  };
}
