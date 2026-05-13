import process from 'process';

/** Teto absoluto de linhas por consulta SELECT (staging e produção). Não aumentar sem revisão de governança. */
export const DB_SAFE_SELECT_MAX = 20;

/**
 * Valor efetivo do teto (1..DB_SAFE_SELECT_MAX). Permite reduzir via env em cenários mais restritivos; nunca ultrapassa DB_SAFE_SELECT_MAX.
 */
export function getDbSafeSelectMax() {
  const raw = process.env.DB_SAFE_SELECT_MAX;
  if (raw == null || raw === '') return DB_SAFE_SELECT_MAX;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return DB_SAFE_SELECT_MAX;
  return Math.min(n, DB_SAFE_SELECT_MAX);
}

export function clampDbSelectLimit(limit) {
  const cap = getDbSafeSelectMax();
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return cap;
  return Math.min(Math.floor(n), cap);
}
