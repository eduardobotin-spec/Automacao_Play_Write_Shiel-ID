import process from 'process';
import { clampDbSelectLimit } from './dbSelectLimits.js';
import { getLogsGeral } from './consultarLogsGeral.js';

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function safeSqlIdentifier(name, fallback = 'data') {
  const n = String(name ?? '').trim();
  if (IDENT.test(n)) return n;
  return fallback;
}

function parseJsonCol(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

/** Coluna JSON do registro (ex.: data, hash_json). Nomes via env sem SQL dinâmico inseguro. */
export function pickLogPayloadRoot(row) {
  const key = safeSqlIdentifier(process.env.LOGS_GENERAL_JSON_COLUMN, 'data');
  const raw = row?.[key] ?? row?.data ?? row?.hash_json;
  return parseJsonCol(raw);
}

function pickSessionBlock(root) {
  if (!root || typeof root !== 'object') return { status: null, status_message: null };
  let ss = root.session_status;
  if (!ss && root.data?.session_status) ss = root.data.session_status;
  if (!ss || typeof ss !== 'object') return { status: null, status_message: null };
  const st = ss.status != null ? String(ss.status).toLowerCase().trim() : null;
  const sm = ss.status_message != null ? String(ss.status_message).trim() : null;
  return { status: st, status_message: sm };
}

function pickFaceBlock(root) {
  if (!root || typeof root !== 'object') return null;
  const inner = root.data && typeof root.data === 'object' ? root.data : root;
  const face = inner.face;
  return face && typeof face === 'object' ? face : null;
}

/**
 * Extrai sinais usuais de face/security_gate + session_status para classificar cenários (ex.: spoof).
 */
export function extrairSinaisKycDoRow(row) {
  const root = pickLogPayloadRoot(row);
  if (!root) {
    return {
      row_id: row?.id ?? null,
      session_status: null,
      status_message: null,
      rejection_reason: null,
      security_rejection_message: null,
      face_rejection_message: null,
      security_gate_presente: false,
    };
  }
  const { status, status_message } = pickSessionBlock(root);
  const face = pickFaceBlock(root);
  const sg = face?.security_gate && typeof face.security_gate === 'object' ? face.security_gate : null;
  const rr = sg?.rejection_reason != null ? String(sg.rejection_reason) : null;
  const srm = sg?.rejection_message != null ? String(sg.rejection_message).trim() : null;
  const frm = face?.rejection_message != null ? String(face.rejection_message).trim() : null;

  return {
    row_id: row?.id ?? null,
    session_status: status,
    status_message: status_message,
    rejection_reason: rr,
    security_rejection_message: srm,
    face_rejection_message: frm,
    security_gate_presente: sg != null,
  };
}

function chaveAgrupamento(s) {
  const sm = (s.status_message || '').slice(0, 120);
  const parts = [s.session_status ?? '', s.rejection_reason ?? '', sm, s.security_rejection_message ?? ''];
  return parts.join('|');
}

/**
 * Percorre logs_general em staging com páginas curtas (LIMIT do projeto).
 *
 * @param {object} [opts]
 * @param {number} [opts.paginasMax=10]
 * @param {boolean} [opts.somenteComSecurityGate=true] — adiciona filtro ilike na coluna configurável
 * @param {number} [opts.limitePorPagina] — repassado ao clamp
 */
export async function inventariarCasosFaceStaging({
  paginasMax = 10,
  somenteComSecurityGate = true,
  limitePorPagina,
} = {}) {
  const lim = clampDbSelectLimit(limitePorPagina);
  const colFiltro = safeSqlIdentifier(
    process.env.LOGS_GENERAL_FILTER_COLUMN || process.env.LOGS_GENERAL_JSON_COLUMN,
    'data'
  );

  let where = null;
  let params = [];
  if (somenteComSecurityGate) {
    where = `where ${colFiltro}::text ilike $1`;
    params = ['%security_gate%'];
  }

  const grupos = new Map();
  const motivos = new Map();
  let cursor = null;
  let linhas = 0;
  let paginas = 0;

  for (; paginas < paginasMax; paginas += 1) {
    const res = await getLogsGeral({
      limit: lim,
      where,
      params,
      idLt: cursor,
    });
    const rows = res?.rows ?? [];
    if (!rows.length) break;

    for (const row of rows) {
      linhas += 1;
      const s = extrairSinaisKycDoRow(row);
      if (s.rejection_reason) {
        motivos.set(s.rejection_reason, (motivos.get(s.rejection_reason) ?? 0) + 1);
      }
      const k = chaveAgrupamento(s);
      if (!grupos.has(k)) {
        grupos.set(k, {
          session_status: s.session_status,
          rejection_reason: s.rejection_reason,
          status_message: s.status_message,
          security_rejection_message: s.security_rejection_message,
          face_rejection_message: s.face_rejection_message,
          security_gate_presente: s.security_gate_presente,
          count: 0,
          exemplo_row_ids: [],
        });
      }
      const g = grupos.get(k);
      g.count += 1;
      if (g.exemplo_row_ids.length < 3 && s.row_id != null) g.exemplo_row_ids.push(s.row_id);
    }

    cursor = rows[rows.length - 1]?.id ?? null;
  }

  const agrupados = [...grupos.values()].sort((a, b) => b.count - a.count);
  const taxonomia_rejection_reason = Object.fromEntries(
    [...motivos.entries()].sort((a, b) => b[1] - a[1])
  );

  return {
    meta: {
      paginas_percorridas: paginas,
      linhas_analisadas: linhas,
      limite_por_pagina: lim,
      filtro_security_gate_texto: somenteComSecurityGate,
      coluna_filtro_sql: colFiltro,
      coluna_json_lida: safeSqlIdentifier(process.env.LOGS_GENERAL_JSON_COLUMN, 'data'),
      host_db: process.env.DB_HOST || null,
    },
    agrupados,
    taxonomia_rejection_reason,
  };
}
