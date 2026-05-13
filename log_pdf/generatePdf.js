import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import { parseLogFile } from '../services/logParser.js';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function pageSize(doc) {
  return { width: doc.page.width, height: doc.page.height };
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatGeneratedAtParts(generatedAt) {
  const raw = String(generatedAt ?? '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::\d{2})?$/);
  if (m) return { date: `${m[3]}/${m[2]}/${m[1]}`, time: `${m[4]}:${m[5]}` };
  const now = new Date();
  return {
    date: `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`,
    time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
  };
}

function roundRect(doc, x, y, w, h, r = 6, fillColor = null, strokeColor = null) {
  if (fillColor) doc.fillColor(fillColor);
  if (strokeColor) doc.strokeColor(strokeColor);
  doc.roundedRect(x, y, w, h, r);
  if (fillColor && strokeColor) doc.fillAndStroke();
  else if (fillColor) doc.fill();
  else doc.stroke();
}

function normalizeStatus(status) {
  const s = String(status ?? '').toUpperCase();
  if (s === 'OK' || s === 'FALLBACK_OK' || s === 'CACHE' || s === 'NOK') return s;
  return 'NOK';
}

function displayStatus(status) {
  return normalizeStatus(status) === 'NOK' ? 'FALHA' : normalizeStatus(status);
}

function statusColor(status) {
  const s = normalizeStatus(status);
  if (s === 'OK') return '#13a056';
  if (s === 'FALLBACK_OK') return '#e47f17';
  if (s === 'CACHE') return '#1f5fbf';
  return '#d64343';
}

function isResumoFinalEntry(entry) {
  const nome = String(entry?.nomeCenario ?? '').trim().toLowerCase();
  const hash = String(entry?.hash ?? '').trim().toLowerCase();
  return nome === 'resumo final - menor preco x provider observado' || hash === 'resumo-precos';
}

function parseModulesFromConsultType(consultType) {
  return Array.from(
    new Set(
      String(consultType ?? '')
        .split('+')
        .map((m) => m.trim())
        .filter(Boolean)
    )
  );
}

function buildSessionsFromEntries(entries) {
  const sessions = new Map();
  for (const entry of entries) {
    if (isResumoFinalEntry(entry)) continue;
    const hash = String(entry?.hash ?? '').trim();
    const key = hash || `no_hash::${entry?.nomeCenario ?? 'sem_cenario'}`;
    if (!sessions.has(key)) {
      sessions.set(key, {
        hash: hash || null,
        generatedAt: entry?.generatedAt ?? null,
        fileName: entry?.fileName ?? null,
        raw: entry?.raw ?? null,
        nomeCenario: entry?.nomeCenario ?? '-',
      });
      continue;
    }
    const current = sessions.get(key);
    if (String(entry?.generatedAt ?? '') >= String(current.generatedAt ?? '')) {
      current.generatedAt = entry?.generatedAt ?? current.generatedAt;
      current.fileName = entry?.fileName ?? current.fileName;
      current.raw = entry?.raw ?? current.raw;
      current.nomeCenario = entry?.nomeCenario ?? current.nomeCenario;
    }
  }
  return Array.from(sessions.values());
}

function buildDetailRows(sessions) {
  const rows = [];
  for (const session of sessions) {
    const rawResponse = session?.raw?.raw_response ?? {};
    const resumo = rawResponse?.resumo_consulta ?? {};
    const comparativo = Array.isArray(resumo?.comparativo_por_modulo) ? resumo.comparativo_por_modulo : [];
    const cenario = String(resumo?.cenario_nome ?? session?.nomeCenario ?? '-');
    const providerGlobal = String(resumo?.provider_observado ?? '-').toLowerCase();
    const fallbackValidado = resumo?.fallback_validado === true;

    if (comparativo.length > 0) {
      for (const item of comparativo) {
        const statusNorm = normalizeStatus(item?.status);
        rows.push({
          cenario,
          modulo: String(item?.modulo ?? '-'),
          bigdataPrice: item?.bigdata_preco,
          netrinPrice: item?.netrin_preco,
          esperado: String(item?.provider_esperado ?? '-').toLowerCase(),
          consultado: String(item?.provider_observado ?? providerGlobal ?? '-').toLowerCase(),
          foiCache: item?.foi_cache === true ? 'SIM' : 'NAO',
          status: statusNorm,
          motivoFallback: String(item?.motivo_fallback ?? '-'),
        });
      }
      continue;
    }

    const modules = parseModulesFromConsultType(resumo?.consult_type ?? '');
    const consultado = providerGlobal || '-';
    const foiCache = consultado === 'cache';
    for (const modulo of modules) {
      rows.push({
        cenario,
        modulo,
        bigdataPrice: null,
        netrinPrice: null,
        esperado: String(resumo?.provider_esperado_menor_preco ?? '-').toLowerCase(),
        consultado,
        foiCache: foiCache ? 'SIM' : 'NAO',
        status: foiCache ? 'CACHE' : fallbackValidado ? 'FALLBACK_OK' : 'NOK',
        motivoFallback: foiCache
          ? 'Consulta atendida via cache (source=cache).'
          : fallbackValidado
            ? 'Fornecedor esperado não utilizado; fallback válido aplicado.'
            : 'Fornecedor esperado não utilizado sem fallback válido.',
      });
    }
  }
  return rows;
}

function buildExecutiveData(sessions, detailRows) {
  const counters = { OK: 0, FALLBACK_OK: 0, NOK: 0, CACHE: 0 };
  for (const row of detailRows) counters[normalizeStatus(row.status)] += 1;
  const totalConsultas = detailRows.length;
  const pct = (n) => `${Math.round((n / Math.max(totalConsultas, 1)) * 100)}%`;
  return {
    totalCenarios: sessions.length,
    totalConsultas,
    ok: counters.OK,
    fallbackOk: counters.FALLBACK_OK,
    falha: counters.NOK,
    cache: counters.CACHE,
    pct,
  };
}

function drawKpiCard(doc, { x, y, w, h, label, value, accent }) {
  roundRect(doc, x, y, w, h, 5, '#ffffff', '#d5ddea');
  doc.fillColor(accent).circle(x + 10, y + 13, 4).fill();
  doc.fillColor('#344c70').font('Helvetica').fontSize(8).text(label, x + 18, y + 7, { width: w - 24 });
  doc.fillColor('#112f54').font('Helvetica-Bold').fontSize(13).text(String(value), x + 18, y + 22, {
    width: w - 24,
  });
}

function drawExecutivePage(doc, sessions, detailRows, sourceFileName) {
  const { width } = pageSize(doc);
  const margin = 24;
  const contentW = width - margin * 2;
  const generated = formatGeneratedAtParts(sessions[0]?.generatedAt);
  const data = buildExecutiveData(sessions, detailRows);

  doc.rect(0, 0, width, doc.page.height).fill('#f3f6fa');
  roundRect(doc, 10, 10, width - 20, doc.page.height - 20, 8, '#ffffff', '#d8e0eb');

  doc.fillColor('#153a6d').font('Helvetica-Bold').fontSize(18).text('Shiel-ID Quality Assurance', margin, 22);
  doc.fillColor('#475f7e').font('Helvetica').fontSize(10).text('Validar Consultas — Estrutura Base QA', margin, 44);
  roundRect(doc, width - 268, 18, 244, 38, 5, '#f8fafc', '#d8e1ef');
  doc.fillColor('#384b69').font('Helvetica').fontSize(8.8).text(`Data: ${generated.date} ${generated.time}`, width - 258, 28);
  doc.text(`Arquivo: ${sourceFileName}`, width - 258, 41, { width: 232, lineBreak: false, ellipsis: true });

  const cardY = 70;
  const gap = 8;
  const cardW = (contentW - gap * 5) / 6;
  const cardH = 52;
  const cards = [
    ['Total de cenários', data.totalCenarios, '#1f5fbf'],
    ['Total de consultas', data.totalConsultas, '#1f5fbf'],
    ['OK', `${data.ok} (${data.pct(data.ok)})`, '#13a056'],
    ['FALLBACK_OK', `${data.fallbackOk} (${data.pct(data.fallbackOk)})`, '#e47f17'],
    ['FALHA', `${data.falha} (${data.pct(data.falha)})`, '#d64343'],
    ['CACHE', `${data.cache} (${data.pct(data.cache)})`, '#1f5fbf'],
  ];
  cards.forEach((c, i) => {
    drawKpiCard(doc, {
      x: margin + i * (cardW + gap),
      y: cardY,
      w: cardW,
      h: cardH,
      label: c[0],
      value: c[1],
      accent: c[2],
    });
  });
}

function buildDetailedColumns(contentW) {
  const cols = [
    { key: 'cenario', label: 'Cenario', w: 155, wrap: true },
    { key: 'modulo', label: 'Modulo', w: 90, wrap: true },
    { key: 'bigdataPrice', label: 'BigData (R$)', w: 70, wrap: false },
    { key: 'netrinPrice', label: 'Netrin (R$)', w: 70, wrap: false },
    { key: 'esperado', label: 'Esperado', w: 80, wrap: false },
    { key: 'consultado', label: 'Consultado', w: 85, wrap: false },
    { key: 'foiCache', label: 'Foi cache?', w: 58, wrap: false },
    { key: 'status', label: 'Status', w: 72, wrap: false },
    { key: 'motivoFallback', label: 'Motivo fallback', w: 140, wrap: true },
  ];
  const total = cols.reduce((acc, c) => acc + c.w, 0);
  cols[cols.length - 1].w += Number((contentW - total).toFixed(2));
  return cols;
}

function formatDetailValue(key, value) {
  if (key === 'bigdataPrice' || key === 'netrinPrice') {
    return value == null || Number.isNaN(Number(value)) ? 'N/D' : Number(value).toFixed(3);
  }
  if (key === 'status') return displayStatus(value);
  return String(value ?? '-');
}

function drawDetailedTablePages(doc, detailRows) {
  if (!detailRows.length) return;

  doc.addPage();
  const { width, height } = pageSize(doc);
  const margin = 24;
  const contentW = width - margin * 2;
  const pageBottom = height - 30;

  const cols = buildDetailedColumns(contentW);
  const headerH = 24;
  const rowMinH = 22;
  const wrapIdx = new Set(cols.map((c, i) => (c.wrap ? i : -1)).filter((i) => i >= 0));
  let y = 22;

  const drawPageHeader = (title) => {
    doc.fillColor('#123e79').font('Helvetica-Bold').fontSize(12).text(title, margin, y);
    y += 18;
  };

  const drawTableHeader = () => {
    let x = margin;
    doc.fillColor('#123e79').rect(margin, y, contentW, headerH).fill();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    for (const c of cols) {
      doc.text(c.label, x + 4, y + 8, { width: c.w - 8, lineBreak: false, ellipsis: true });
      x += c.w;
    }
    y += headerH;
  };

  drawPageHeader('DETALHAMENTO DAS CONSULTAS');
  drawTableHeader();
  doc.font('Helvetica').fontSize(8);

  for (const row of detailRows) {
    const values = cols.map((c) => formatDetailValue(c.key, row[c.key]));
    const heights = values.map((v, i) => {
      if (!wrapIdx.has(i)) return rowMinH;
      return Math.ceil(doc.heightOfString(v, { width: cols[i].w - 8, lineBreak: true }) + 8);
    });
    const rowH = Math.max(rowMinH, ...heights);

    if (y + rowH > pageBottom) {
      doc.addPage();
      y = 22;
      drawPageHeader('DETALHAMENTO DAS CONSULTAS (continuação)');
      drawTableHeader();
      doc.font('Helvetica').fontSize(8);
    }

    let x = margin;
    doc.fillColor('#ffffff').rect(margin, y, contentW, rowH).fill();
    doc.strokeColor('#d8e1ef').rect(margin, y, contentW, rowH).stroke();

    for (let i = 0; i < cols.length; i += 1) {
      const c = cols[i];
      const v = values[i];
      const color = c.key === 'status' ? statusColor(row.status) : '#243750';
      doc.fillColor(color).text(v, x + 4, y + 6, {
        width: c.w - 8,
        lineBreak: wrapIdx.has(i),
        ellipsis: !wrapIdx.has(i),
      });
      x += c.w;
    }
    y += rowH;
  }
}

function writeDetailXlsx({ xlsxPath, detailRows, sessions, sourceFileName }) {
  const exec = buildExecutiveData(sessions, detailRows);
  const cols = buildDetailedColumns(793);
  const header = cols.map((c) => c.label);
  const rows = detailRows.map((row) => cols.map((c) => formatDetailValue(c.key, row[c.key])));
  const aoa = [
    ['Shiel-ID Quality Assurance'],
    ['Validar Consultas — Estrutura Base QA'],
    ['Arquivo', sourceFileName],
    ['Total de cenários', exec.totalCenarios],
    ['Total de consultas', exec.totalConsultas],
    ['OK', `${exec.ok} (${exec.pct(exec.ok)})`],
    ['FALLBACK_OK', `${exec.fallbackOk} (${exec.pct(exec.fallbackOk)})`],
    ['FALHA', `${exec.falha} (${exec.pct(exec.falha)})`],
    ['CACHE', `${exec.cache} (${exec.pct(exec.cache)})`],
    [],
    header,
    ...rows,
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Detalhamento');
  XLSX.writeFile(wb, xlsxPath);
}

/**
 * @param {string} logFilePath
 * @param {string | { pdfPath: string; xlsxPath?: string }} outDirOrOptions
 */
export async function generatePdfFromLog(logFilePath, outDirOrOptions) {
  const baseName = path.basename(logFilePath, '.txt');
  const entries = parseLogFile(logFilePath);
  const sessions = buildSessionsFromEntries(entries);
  const detailRows = buildDetailRows(sessions);

  const isOpts =
    outDirOrOptions != null && typeof outDirOrOptions === 'object' && 'pdfPath' in outDirOrOptions;
  const pdfPath = isOpts
    ? outDirOrOptions.pdfPath
    : path.join(String(outDirOrOptions), `${baseName}.pdf`);
  const xlsxPath = isOpts ? outDirOrOptions.xlsxPath : null;

  ensureDir(path.dirname(pdfPath));
  const outputs = [];

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 24 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    drawExecutivePage(doc, sessions, detailRows, path.basename(logFilePath));
    drawDetailedTablePages(doc, detailRows);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  outputs.push(pdfPath);

  if (xlsxPath) {
    ensureDir(path.dirname(xlsxPath));
    writeDetailXlsx({ xlsxPath, detailRows, sessions, sourceFileName: path.basename(logFilePath) });
    outputs.push(xlsxPath);
  }

  return outputs;
}
