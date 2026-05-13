import fs from 'fs';
import path from 'path';

/** Nomenclatura canónica no multipart: maiúsculas, underscore, extensão .png */
export const CENTER_PNG_NAMES = [
  'CENTER_1.png',
  'CENTER_2.png',
  'CENTER_3.png',
  'CENTER_4.png',
  'CENTER_5.png',
  'CENTER_6.png',
];

/** Aceita CENTER_1.png ou center_1.png no disco (Windows/mac costumam ter legado em minúsculas). */
const SLOT_ARQUIVO_RE = /^center_([1-6])\.(png|jpe?g)$/i;

/** Layout antigo para *SPOOFING_REPROVADO* (ex.: CA002): um PNG spoof; o multipart usa 6× o mesmo blob com nomes CENTER_*. */
const LEGACY_SPOOF_CANDIDATES = [
  'converted.png',
  'spoofing_01.png',
  'spoofing_02.png',
  'spoofing_03.png',
  'spoofing_04.png',
  'spoofing_05.png',
  'spoofing_06.png',
];
const LEGACY_SEM_MOVIMENTOS_SPOOF_CANDIDATES = [
  'spoofing_01.png',
  'spoofing_02.png',
  'spoofing_03.png',
  'spoofing_04.png',
  'spoofing_05.png',
  'spoofing_06.png',
  'converted.png',
];
const LEGACY_GATES_NAMES = [
  'face_look_forward_1.jpeg',
  'face_look_forward_2.jpeg',
  'face_look_forward_3.jpeg',
  'face_look_forward_4.jpeg',
  'face_look_forward_5.jpeg',
  'face_look_forward_6.jpeg',
];
const LEGACY_ZOOM_CANDIDATES = [
  'CENTER_1.jpeg',
  'CENTER_2.jpeg',
  'CENTER_3.jpeg',
  'CENTER_4.jpeg',
  'CENTER_5.jpeg',
  'CENTER_6.jpeg',
];
/**
 * Resolve o path real no disco: tenta o nome canónico, depois qualquer variante só de capitalização.
 */
export function resolverPathImagemCenter(baseDir, canonicalName) {
  const exact = path.join(baseDir, canonicalName);
  if (fs.existsSync(exact)) return exact;
  const alvo = canonicalName.toLowerCase();
  for (const ent of fs.readdirSync(baseDir)) {
    if (ent.toLowerCase() === alvo) return path.join(baseDir, ent);
  }

  // fallback: para CENTER_1..6, aceita qualquer extensão suportada (.png/.jpg/.jpeg)
  const slot = slotDoNomeFicheiro(canonicalName);
  if (slot != null) {
    const candidatos = [];
    for (const ent of fs.readdirSync(baseDir)) {
      if (slotDoNomeFicheiro(ent) === slot) candidatos.push(ent);
    }
    if (candidatos.length > 0) {
      const prioridadeExt = ['.png', '.jpeg', '.jpg'];
      candidatos.sort((a, b) => {
        const extA = path.extname(a).toLowerCase();
        const extB = path.extname(b).toLowerCase();
        const pA = prioridadeExt.indexOf(extA);
        const pB = prioridadeExt.indexOf(extB);
        const iA = pA === -1 ? 99 : pA;
        const iB = pB === -1 ? 99 : pB;
        if (iA !== iB) return iA - iB;
        return a.localeCompare(b);
      });
      return path.join(baseDir, candidatos[0]);
    }
  }
  return null;
}

function slotDoNomeFicheiro(f) {
  const m = f.match(SLOT_ARQUIVO_RE);
  return m ? Number(m[1]) : null;
}

function isNomeLegadoSpoof(f) {
  const lower = f.toLowerCase();
  if (lower === 'converted.png') return true;
  return /^spoofing_0[1-6]\.png$/i.test(f);
}

function isZoomLikeCenario(nomeCenario) {
  const id = String(nomeCenario ?? '').toUpperCase();
  return id.includes('ZOOM') || id.includes('CA011');
}

/** Cenários CA002-like: pasta com spoofing_01 / converted (não CA005 sem movimentos). */
function isSpoofingReprovadoCenario(cenarioId) {
  const id = String(cenarioId);
  return id.includes('SPOOFING_REPROVADO') && !id.includes('SEM_MOVIMENTOS_REAIS');
}

function resolverPrimeiroLegadoSpoof(baseDir) {
  for (const n of LEGACY_SPOOF_CANDIDATES) {
    const p = resolverPathImagemCenter(baseDir, n);
    if (p) return p;
  }
  return null;
}

function resolverPrimeiroSemMovimentosSpoof(baseDir) {
  for (const n of LEGACY_SEM_MOVIMENTOS_SPOOF_CANDIDATES) {
    const p = resolverPathImagemCenter(baseDir, n);
    if (p) return p;
  }
  return null;
}

function resolverPrimeiroZoom(baseDir) {
  for (const n of LEGACY_ZOOM_CANDIDATES) {
    const p = resolverPathImagemCenter(baseDir, n);
    if (p) return p;
  }
  return null;
}

function resolverCentrosDisponiveis(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  const pairs = [];
  for (const ent of fs.readdirSync(baseDir)) {
    const slot = slotDoNomeFicheiro(ent);
    if (slot == null) continue;
    pairs.push({ slot, filePath: path.join(baseDir, ent) });
  }
  pairs.sort((a, b) => a.slot - b.slot);
  return pairs.map((p) => p.filePath);
}

function resolverLegacyGates(baseDir) {
  const out = [];
  for (const n of LEGACY_GATES_NAMES) {
    const p = resolverPathImagemCenter(baseDir, n);
    if (!p) return null;
    out.push(p);
  }
  return out;
}

function mapearComRepeticao(paths) {
  return CENTER_PNG_NAMES.map((name, idx) => ({
    name,
    filePath: paths[idx % paths.length],
  }));
}

export function mimeFromImagePath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'image/png';
}

/** Os 6 CENTER_[i].png existem no disco (case-insensitive). */
export function pastaTemSeisCentros(baseDir) {
  if (!fs.existsSync(baseDir)) return false;
  return CENTER_PNG_NAMES.every((n) => resolverPathImagemCenter(baseDir, n));
}

/**
 * Conta slots 1–6 preenchidos (ficheiro presente, nome canónico ou só diferença de maiúsculas).
 */
export function contarImagensBiometriaValidas(baseDir) {
  if (!fs.existsSync(baseDir)) return 0;
  return resolverCentrosDisponiveis(baseDir).length;
}

/**
 * Valida pasta:
 * - **Modo A:** exactamente 6× `CENTER_[1-6].png` (case-insensitive no disco), sem outros ficheiros;
 * - **Modo B (spoofing reprovado):** só ficheiros `converted.png` / `spoofing_01.png`…`spoofing_03.png`, com pelo menos um existente.
 * @param {string} nomeCenario — id da pasta (ex.: CA002_SPOOFING_REPROVADO)
 */
export function validarPastaBiometria(baseDir, nomeCenario) {
  if (!fs.existsSync(baseDir)) {
    throw new Error(
      `Quantidade de imagens inválida para o cenário ${nomeCenario}. Encontrado: 0 imagens. Esperado: 6.`
    );
  }

  const entries = fs.readdirSync(baseDir);

  if (pastaTemSeisCentros(baseDir)) {
    const porSlot = new Map();
    for (const f of entries) {
      const slot = slotDoNomeFicheiro(f);
      if (slot == null) {
        throw new Error(
          `Pasta do cenário ${nomeCenario} tem os 6 CENTER_*.png mas contém também ficheiro não permitido: ${f}. ` +
            `Remova ficheiros extra ou use apenas: ${CENTER_PNG_NAMES.join(', ')}.`
        );
      }
      if (porSlot.has(slot)) {
        if (isZoomLikeCenario(nomeCenario)) {
          continue;
        }
        throw new Error(
          `Pasta do cenário ${nomeCenario}: mais de um ficheiro para a mesma posição (${slot}): ` +
            `"${porSlot.get(slot)}" e "${f}".`
        );
      }
      porSlot.set(slot, f);
    }
    if (porSlot.size !== 6) {
      const faltam = [1, 2, 3, 4, 5, 6].filter((s) => !porSlot.has(s));
      throw new Error(
        `Quantidade de imagens inválida para o cenário ${nomeCenario}. Encontrado: ${porSlot.size} imagens. ` +
          `Faltam os slots: ${faltam.join(', ')}. Esperado: 6 (CENTER_1 … CENTER_6).`
      );
    }
    return;
  }

  if (isSpoofingReprovadoCenario(nomeCenario) && resolverPrimeiroLegadoSpoof(baseDir)) {
    for (const f of entries) {
      if (!isNomeLegadoSpoof(f)) {
        throw new Error(
          `Pasta do cenário ${nomeCenario} (modo spoofing reprovado) contém ficheiro não permitido: ${f}. ` +
            `Use só: ${LEGACY_SPOOF_CANDIDATES.join(', ')} (ou renomeie as imagens para ${CENTER_PNG_NAMES.join(', ')}).`
        );
      }
    }
    return;
  }

  if (String(nomeCenario).includes('SEM_MOVIMENTOS_REAIS')) {
    const spoof = resolverPrimeiroSemMovimentosSpoof(baseDir);
    const centers = resolverCentrosDisponiveis(baseDir);
    if (spoof && centers.length > 0) return;
  }

  const centersParciais = resolverCentrosDisponiveis(baseDir);
  if (centersParciais.length > 0) return;

  const legacyGates = resolverLegacyGates(baseDir);
  if (legacyGates && legacyGates.length === 6) return;

  throw new Error(
    `Pasta do cenário ${nomeCenario} inválida: não há 6 ficheiros ${CENTER_PNG_NAMES.join(', ')} ` +
      `nem layout spoofing reprovado (${LEGACY_SPOOF_CANDIDATES.join(', ')}). ` +
      `Coloque 6 imagens CENTER_1…CENTER_6 ou, para spoofing reprovado, use um PNG legado listado.`
  );
}

/**
 * @returns {{ name: string, filePath: string }[]}
 */
export function partesMultipartCentros(baseDir, nomeCenario) {
  validarPastaBiometria(baseDir, nomeCenario);

  if (pastaTemSeisCentros(baseDir)) {
    return CENTER_PNG_NAMES.map((name) => {
      const filePath = resolverPathImagemCenter(baseDir, name);
      if (!filePath) {
        throw new Error(`processarBiometria: ficheiro em falta após validação: ${name} em ${baseDir}`);
      }
      return { name, filePath };
    });
  }

  if (String(nomeCenario).includes('SEM_MOVIMENTOS_REAIS')) {
    const spoof = resolverPrimeiroSemMovimentosSpoof(baseDir);
    const centers = resolverCentrosDisponiveis(baseDir);
    if (spoof && centers.length > 0) {
      return [
        { name: CENTER_PNG_NAMES[0], filePath: spoof },
        { name: CENTER_PNG_NAMES[1], filePath: spoof },
        { name: CENTER_PNG_NAMES[2], filePath: spoof },
        { name: CENTER_PNG_NAMES[3], filePath: spoof },
        { name: CENTER_PNG_NAMES[4], filePath: centers[0] },
        { name: CENTER_PNG_NAMES[5], filePath: centers[0] },
      ];
    }
  }

  const centersParciais = resolverCentrosDisponiveis(baseDir);
  if (centersParciais.length > 0) {
    return mapearComRepeticao(centersParciais);
  }

  const legacyGates = resolverLegacyGates(baseDir);
  if (legacyGates && legacyGates.length > 0) {
    return mapearComRepeticao(legacyGates);
  }

  const fonteSpoof = resolverPrimeiroLegadoSpoof(baseDir);
  if (fonteSpoof && isSpoofingReprovadoCenario(nomeCenario)) {
    return CENTER_PNG_NAMES.map((name) => ({ name, filePath: fonteSpoof }));
  }

  throw new Error(`processarBiometria: combinação de pasta/cenário irreconhecível em ${baseDir}`);
}
