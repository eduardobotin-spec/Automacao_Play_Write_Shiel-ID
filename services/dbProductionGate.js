import process from 'process';

/**
 * Hosts considerados produção vêm **apenas** de variáveis de ambiente (definir no `.env` local, nunca commitar).
 * Use `DB_PRODUCTION_HOST` (um host) ou `DB_PRODUCTION_HOSTS` (vários separados por vírgula).
 */
export function listProductionHosts() {
  const single = process.env.DB_PRODUCTION_HOST?.trim();
  const multi = (process.env.DB_PRODUCTION_HOSTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [...multi];
  if (single) out.push(single);
  return [...new Set(out)];
}

export function hostIsProduction(host) {
  const h = String(host ?? '').trim().toLowerCase();
  if (!h) return false;
  return listProductionHosts().some((p) => p.toLowerCase() === h);
}

/**
 * SELECT / conexões de leitura contra host de produção: exige confirmação explícita no ambiente
 * (feita por você após autorização — agentes não devem preencher isso sozinhos).
 */
export function assertProductionReadConnectionAllowed(host) {
  if (!hostIsProduction(host)) return;

  if (process.env.DB_PRODUCTION_EXECUTION_ALLOWED !== 'yes') {
    throw new Error(
      '[PostgreSQL produção] Leitura bloqueada. Obtenha autorização explícita, rode o mesmo fluxo em staging primeiro, ' +
        'e só então defina no .env (local, não commitar): DB_PRODUCTION_EXECUTION_ALLOWED=yes'
    );
  }
  if (process.env.DB_PRODUCTION_AFTER_STAGING !== 'yes') {
    throw new Error(
      '[PostgreSQL produção] Confirme execução prévia em staging e defina DB_PRODUCTION_AFTER_STAGING=yes no .env local.'
    );
  }
}

/**
 * UPDATE / DELETE / automação de escrita: sempre bloqueado quando o host é reconhecido como produção.
 */
export function assertProductionWriteBlocked(host) {
  if (!hostIsProduction(host)) return;
  throw new Error(
    '[PostgreSQL produção] UPDATE/DELETE desabilitados para host de produção neste repositório. Use staging.'
  );
}
