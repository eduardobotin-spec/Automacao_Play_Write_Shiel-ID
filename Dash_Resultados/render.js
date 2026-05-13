function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function norm(value) {
  return String(value ?? '').trim().toLowerCase();
}

function statusClass(status) {
  const s = norm(status);
  if (s === 'approved') return 'status-approved';
  if (s === 'rejected') return 'status-rejected';
  if (s === 'analysis') return 'status-analysis';
  if (s === 'pending') return 'status-pending';
  if (s === 'error') return 'status-error';
  return 'status-unknown';
}

export function renderDashboardHtml(rows) {
  const total = rows.length;
  const count = (st) => rows.filter((r) => norm(r.status) === st).length;
  const approved = count('approved');
  const rejected = count('rejected');
  const analysis = count('analysis');
  const pending = count('pending');
  const error = count('error');
  const ok = approved;
  const fail = rejected + error;

  const renderedRows = rows
    .map(
      (r) => `<tr class="${statusClass(r.status)}" data-status="${esc(norm(r.status))}">
  <td>${esc(r.generatedAt)}</td>
  <td>${esc(r.nomeCenario)}</td>
  <td>${esc(r.cpf)}</td>
  <td>${esc(r.hash)}</td>
  <td>${esc(r.success)}</td>
  <td><span class="pill ${statusClass(r.status)}">${esc(r.status)}</span></td>
  <td>${esc(r.statusMessage)}</td>
  <td>${esc(r.fileName)}</td>
</tr>`
    )
    .join('\n');

  const uniqueExecucoes = Array.from(
    new Map(
      rows
        .filter((r) => String(r.fileName || '').trim())
        .map((r) => [String(r.fileName), { fileName: String(r.fileName), href: String(r.pdfHref || '#') }])
    ).values()
  ).sort((a, b) => b.fileName.localeCompare(a.fileName));
  const lastTwo = uniqueExecucoes.slice(0, 2).map((exec, idx) => ({
    href: exec.href,
    label: idx === 0 ? `Última execução (${exec.fileName})` : `Execução anterior (${exec.fileName})`,
  }));

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dash Resultados</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <style>
    :root{
      --bg:#f4f7fb; --card:#ffffff; --border:#d8deea; --text:#1e2430; --muted:#4b5568;
      --blue:#0c3e7d; --green:#13a056; --red:#d64343; --orange:#e89c11; --gray:#6b7280; --black:#111827;
    }
    *{box-sizing:border-box;}
    body { font-family: Arial, sans-serif; margin: 0; background: var(--bg); color: var(--text); }
    .page{ max-width: 1280px; margin: 0 auto; padding: 18px; }
    h1 { margin: 0; font-size: 20px; }
    .meta { margin-top: 6px; color: var(--muted); font-size: 13px; }

    /* Topbar estilo FerramentaQA (adaptado) */
    .topbar{
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 14px;
      box-shadow: 0 2px 10px rgba(17,24,39,.04);
      margin-bottom: 12px;
    }
    .titleRow{ display:flex; flex-direction:column; gap:4px; min-width: 240px; }
    .actions{ display:flex; gap: 8px; flex-wrap: wrap; justify-content:flex-end; }
    .btn{
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #f2f5fb;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      color: #173056;
      text-decoration: none;
      display:inline-flex;
      align-items:center;
      gap:8px;
      white-space: nowrap;
    }
    .btn-accent{
      border-color: rgba(12,62,125,.35);
      background: rgba(12,62,125,.08);
      color: var(--blue);
    }
    .btn:disabled{ opacity:.55; cursor:not-allowed; }

    .header{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 2px 10px rgba(17,24,39,.04);
    }
    .divider{ height:1px; background: #cbd3de; margin: 12px 0; }

    .topRow{ display:flex; gap: 12px; align-items: stretch; flex-wrap: wrap; }
    .kpis{ display:flex; gap: 10px; flex: 1 1 560px; flex-wrap: wrap; }
    .kpi{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      min-width: 160px;
      flex: 1 1 160px;
    }
    .kpiLabel{ color: var(--muted); font-size: 12px; margin-bottom: 6px; }
    .kpiValue{ color: #173056; font-size: 20px; font-weight: 700; }
    .accent{ display:inline-block; width:8px; height:8px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }

    .chart{
      flex: 1 1 320px;
      max-width: 360px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      min-height: 120px;
      overflow: hidden;
    }
    .chartTitle{ color:#173056; font-weight:700; font-size: 13px; margin-bottom: 10px; }
    .bars{ display:flex; align-items: flex-end; gap: 10px; height: 70px; width: 100%; overflow: hidden; }
    .barWrap{ flex: 1 1 0; min-width: 0; text-align:center; }
    .bar{ width: 100%; border-radius: 6px 6px 2px 2px; background: var(--gray); }
    .barLbl{ font-size: 11px; color: var(--muted); margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .barVal{ font-size: 11px; color: var(--black); }

    @media (max-width: 920px){
      .chart{ max-width: none; }
    }

    .filters{
      display:flex; gap: 10px; flex-wrap: wrap; margin-top: 12px;
    }
    .filters input, .filters select{
      padding: 9px 10px; border: 1px solid var(--border); border-radius: 8px; background: #fff; font-size: 13px;
    }
    .filters input{ min-width: 220px; }
    .filters .btn{
      padding: 9px 12px; border: 1px solid var(--border); border-radius: 8px; background: #f2f5fb; cursor: pointer; font-size: 13px;
    }

    .tableCard{
      margin-top: 14px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(17,24,39,.04);
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #edf1f7; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f2f5fb; position: sticky; top: 0; z-index: 1; border-bottom: 1px solid var(--border); }
    tbody tr:nth-child(even){ background: #fbfcff; }
    tbody tr:hover{ background: #f6f9ff; }

    .pill{
      display:inline-block; padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 700;
      border: 1px solid var(--border); background: #fff;
    }
    .status-approved{ color: var(--green); border-color: rgba(19,160,86,.25); background: rgba(19,160,86,.06); }
    .status-rejected{ color: var(--red); border-color: rgba(214,67,67,.25); background: rgba(214,67,67,.06); }
    .status-analysis{ color: var(--orange); border-color: rgba(232,156,17,.25); background: rgba(232,156,17,.08); }
    .status-pending{ color: #475569; border-color: rgba(71,85,105,.25); background: rgba(71,85,105,.06); }
    .status-error{ color: var(--red); border-color: rgba(214,67,67,.25); background: rgba(214,67,67,.06); }
    .status-unknown{ color: var(--gray); }

    .empty { margin-top: 20px; color: var(--gray); }
  </style>
</head>
<body>
  <div class="page">
    <div class="topbar">
      <div class="titleRow">
        <h1>Dashboard de Resultados</h1>
        <div class="meta">Cenários consolidados a partir dos logs .txt da pasta <code>logs_txt</code>.</div>
      </div>
      <div class="actions">
        <select id="pdfSelect" class="btn" ${lastTwo.length ? '' : 'disabled'}>
          ${lastTwo
            .map((p) => `<option value="${esc(p.href)}">${esc(p.label)}</option>`)
            .join('')}
        </select>
        <a id="openPdf" class="btn btn-accent" href="${lastTwo[0]?.href ? esc(lastTwo[0].href) : '#'}" ${
    lastTwo.length ? '' : 'aria-disabled="true"'
  } target="_blank" rel="noreferrer">Abrir PDF</a>
        <button id="exportPdf" class="btn btn-accent" ${rows.length ? '' : 'disabled'}>Gerar Relatório</button>
      </div>
    </div>

    <div class="header">

      <div class="divider"></div>

      <div class="topRow">
        <div class="kpis">
          <div class="kpi"><div class="kpiLabel"><span class="accent" style="background: var(--blue)"></span>Total de Cenários</div><div class="kpiValue">${esc(total)}</div></div>
          <div class="kpi"><div class="kpiLabel"><span class="accent" style="background: var(--green)"></span>Aprovados</div><div class="kpiValue">${esc(approved)}</div></div>
          <div class="kpi"><div class="kpiLabel"><span class="accent" style="background: var(--red)"></span>Reprovados</div><div class="kpiValue">${esc(rejected)}</div></div>
          <div class="kpi"><div class="kpiLabel"><span class="accent" style="background: var(--orange)"></span>Em análise</div><div class="kpiValue">${esc(analysis)}</div></div>
          <div class="kpi"><div class="kpiLabel"><span class="accent" style="background: #475569"></span>Pendentes</div><div class="kpiValue">${esc(pending)}</div></div>
          <div class="kpi"><div class="kpiLabel"><span class="accent" style="background: var(--red)"></span>Erros</div><div class="kpiValue">${esc(error)}</div></div>
        </div>

        <div class="chart">
          <div class="chartTitle">Visão geral</div>
          <div class="bars">
            ${(() => {
              const max = Math.max(1, approved, rejected, analysis, pending, error);
              const mk = (label, val, color) => {
                const h = Math.round((val / max) * 70);
                return `<div class="barWrap">
  <div class="bar" style="height:${h}px;background:${color}"></div>
  <div class="barVal">${esc(val)}</div>
  <div class="barLbl">${esc(label)}</div>
</div>`;
              };
              return [
                mk('Aprov.', approved, 'var(--green)'),
                mk('Reprov.', rejected, 'var(--red)'),
                mk('Análise', analysis, 'var(--orange)'),
                mk('Pend.', pending, '#475569'),
                mk('Erro', error, 'var(--red)'),
              ].join('');
            })()}
          </div>
          <div class="meta" style="margin-top:10px">OK: <b>${esc(ok)}</b> &nbsp;|&nbsp; Falhas: <b>${esc(fail)}</b></div>
        </div>
      </div>

      <div class="filters">
        <input id="fScenario" placeholder="Filtrar por cenário..." />
        <input id="fCpf" placeholder="Filtrar por CPF..." />
        <select id="fStatus">
          <option value="">Status (todos)</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="analysis">analysis</option>
          <option value="pending">pending</option>
          <option value="error">error</option>
        </select>
        <button class="btn" id="btnClear">Limpar filtros</button>
      </div>
    </div>

  ${
    rows.length
      ? `<div class="tableCard"><table id="tbl">
    <thead>
      <tr>
        <th>Data/Hora</th>
        <th>Cenário</th>
        <th>CPF</th>
        <th>Hash</th>
        <th>Success</th>
        <th>Status</th>
        <th>Status_message</th>
        <th>Arquivo</th>
      </tr>
    </thead>
    <tbody>
${renderedRows}
    </tbody>
  </table></div>
  <script>
    const byId = (id) => document.getElementById(id);
    const fScenario = byId('fScenario');
    const fCpf = byId('fCpf');
    const fStatus = byId('fStatus');
    const btnClear = byId('btnClear');

    function norm(v){ return String(v||'').trim().toLowerCase(); }

    function applyFilters(){
      const s = norm(fScenario.value);
      const c = norm(fCpf.value);
      const st = norm(fStatus.value);
      const rows = document.querySelectorAll('#tbl tbody tr');
      for (const tr of rows){
        const tds = tr.querySelectorAll('td');
        const scenario = norm(tds[1]?.textContent);
        const cpf = norm(tds[2]?.textContent);
        const status = norm(tr.getAttribute('data-status'));
        const ok = (!s || scenario.includes(s)) && (!c || cpf.includes(c)) && (!st || status === st);
        tr.style.display = ok ? '' : 'none';
      }
    }

    fScenario.addEventListener('input', applyFilters);
    fCpf.addEventListener('input', applyFilters);
    fStatus.addEventListener('change', applyFilters);
    btnClear.addEventListener('click', () => {
      fScenario.value = '';
      fCpf.value = '';
      fStatus.value = '';
      applyFilters();
    });
  </script>`
      : '<div class="empty">Nenhum cenário encontrado nos logs atuais.</div>'
  }
</div>

<script>
  (function wirePdfSelect(){
    const sel = document.getElementById('pdfSelect');
    const link = document.getElementById('openPdf');
    if(!sel || !link) return;
    sel.addEventListener('change', () => {
      const v = sel.value || '#';
      link.setAttribute('href', v);
    });
  })();

  // Dados do relatório (mesma fonte: logs consolidados)
  const DASH_ROWS = ${JSON.stringify(rows)};

  function pad2(n){ return String(n).padStart(2,'0'); }
  function stamp(){
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()) + '_' + pad2(d.getHours()) + '-' + pad2(d.getMinutes()) + '-' + pad2(d.getSeconds());
  }
  function safeFilePart(v){
    return String(v||'')
      .trim()
      .replace(/[<>:"/\\\\|?*\\u0000-\\u001F]/g,'_')
      .replace(/\\s+/g,' ')
      .slice(0,120)
      .trim()
      .replace(/\\s/g,'_');
  }
  function norm(v){ return String(v||'').trim().toLowerCase(); }

  function countStatus(rows, st){ return rows.filter(r => norm(r.status) === st).length; }

  function drawHeader(doc, title, subtitle){
    doc.setFillColor(28,35,42);
    doc.rect(0,0,210,18,'F');
    doc.setTextColor(245,250,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(12);
    doc.text(title, 12, 12);
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.text(subtitle, 12, 16.2);
    doc.setTextColor(17,24,39);
  }

  function drawSummary(doc, rows){
    // Protótipo fornecido pelo usuário: layout final do Resumo (PDF 1)
    const total = rows.length;
    const approved = countStatus(rows,'approved');
    const rejected = countStatus(rows,'rejected');
    const analysis = countStatus(rows,'analysis');
    const pending = countStatus(rows,'pending');
    const error = countStatus(rows,'error');
    const failed = rejected + error;
    const successPct = total ? Math.round((approved / total) * 100) : 0;

    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    const d = new Date();
    const genDate = pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
    const genTime = pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());

    // Fundo cinza bem claro (como no protótipo)
    doc.setFillColor(246, 247, 249);
    doc.rect(0, 0, w, h, 'F');

    // Card principal branco com borda suave
    const cardX = 18;
    const cardY = 10;
    const cardW = w - 36;
    const cardH = h - 18;
    doc.setDrawColor(224, 228, 233);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'FD');

    // Header (texto à esquerda + ícone à direita)
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.text('Shiel-ID | Quality Assurance', cardX + 14, cardY + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text('Resumo de Execução', cardX + 14, cardY + 23);

    // Ícone escudo (vetorial simples) no canto direito
    const shieldCx = cardX + cardW - 22;
    const shieldTop = cardY + 13;
    doc.setDrawColor(80, 90, 110);
    doc.setLineWidth(0.9);
    doc.setFillColor(255, 255, 255);
    doc
      .lines(
        [
          [4, 0],
          [0, 5],
          [-2, 3],
          [-2, -3],
          [0, -5],
        ],
        shieldCx,
        shieldTop,
        [1, 1],
        'S',
        true
      );

    // Linha divisória
    doc.setDrawColor(226, 230, 235);
    doc.setLineWidth(1);
    doc.line(cardX + 10, cardY + 30, cardX + cardW - 10, cardY + 30);

    // Título central
    doc.setTextColor(35, 35, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Resultados da Execução de Testes Automatizados', cardX + 14, cardY + 48);

    // Cards KPI (4)
    const kpiTop = cardY + 56;
    const kpiX0 = cardX + 14;
    const kpiGap = 6;
    const kpiW = (cardW - 28 - kpiGap * 3) / 4;
    const kpiH = 36;

    const drawIcon = (type, cx, cy, fg) => {
      doc.setDrawColor(fg[0], fg[1], fg[2]);
      doc.setFillColor(fg[0], fg[1], fg[2]);
      doc.setLineWidth(1);

      if (type === 'folder') {
        // pasta
        doc.setDrawColor(fg[0], fg[1], fg[2]);
        doc.setLineWidth(1);
        doc.roundedRect(cx - 5.8, cy - 2.2, 11.6, 7.4, 1.2, 1.2, 'S');
        doc.roundedRect(cx - 5.8, cy - 4.6, 6.2, 3.0, 1.0, 1.0, 'S');
        return;
      }
      if (type === 'check') {
        // check
        doc.setLineWidth(1.4);
        doc.line(cx - 4.5, cy, cx - 1.4, cy + 3.4);
        doc.line(cx - 1.4, cy + 3.4, cx + 5.2, cy - 3.6);
        return;
      }
      if (type === 'alert') {
        // triângulo alerta
        doc.setLineWidth(1);
        doc.triangle(cx, cy - 6.2, cx - 6.0, cy + 5.2, cx + 6.0, cy + 5.2, 'S');
        doc.setLineWidth(1.2);
        doc.line(cx, cy - 2.0, cx, cy + 2.2);
        doc.circle(cx, cy + 4.0, 0.7, 'F');
        return;
      }
      // target (%)
      doc.setLineWidth(1);
      doc.circle(cx, cy, 5.3, 'S');
      doc.circle(cx, cy, 2.8, 'S');
      doc.setLineWidth(1.2);
      doc.line(cx, cy, cx + 4.3, cy - 4.3);
      doc.circle(cx + 4.3, cy - 4.3, 0.8, 'F');
    };

    const drawKpi = (idx, iconBg, iconFg, iconType, label, value) => {
      const x = kpiX0 + idx * (kpiW + kpiGap);
      doc.setDrawColor(226, 230, 235);
      doc.setFillColor(244, 245, 247);
      doc.roundedRect(x, kpiTop, kpiW, kpiH, 3, 3, 'FD');

      // ícone circular
      doc.setFillColor(iconBg[0], iconBg[1], iconBg[2]);
      doc.circle(x + 12, kpiTop + 11, 6.5, 'F');
      drawIcon(iconType, x + 12, kpiTop + 11, iconFg);

      // label + value
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.2);
      const labelLines = doc.splitTextToSize(String(label), kpiW - 12);
      // centraliza o label, com quebra controlada (1–2 linhas)
      doc.text(labelLines, x + kpiW / 2, kpiTop + 23.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(String(value), x + kpiW / 2, kpiTop + 34, { align: 'center' });
    };

    // Ícones (aproximação do protótipo sem assets externos)
    drawKpi(0, [220, 230, 245], [14, 67, 135], 'folder', 'Total de Testes', total);
    drawKpi(1, [220, 245, 230], [19, 160, 86], 'check', 'Testes Aprovados', approved);
    drawKpi(2, [245, 225, 225], [214, 67, 67], 'alert', 'Testes Falhos', failed);
    drawKpi(3, [245, 235, 210], [232, 156, 17], 'target', 'Taxa de Sucesso (%)', String(successPct) + '%');

    // Bloco Distribuição + Status Final (lado a lado)
    const sectionTop = kpiTop + kpiH + 12;
    doc.setTextColor(35, 35, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.2);
    doc.text('Distribuição de Status', cardX + 14, sectionTop);

    const tableX = cardX + 14;
    const tableY = sectionTop + 6;
    const tableW = cardW - 28 - 56;
    const statusBoxW = 52;
    const statusBoxX = cardX + cardW - 14 - statusBoxW;
    const statusBoxY = tableY;

    // Tabela (com header)
    doc.setDrawColor(226, 230, 235);
    doc.setFillColor(255, 255, 255);
    const rowsPt = [
      { label: 'Aprovado', v: approved },
      { label: 'Rejeitado', v: rejected },
      { label: 'Em Análise', v: analysis },
      { label: 'Pendente', v: pending },
      { label: 'Erro', v: error },
    ];
    const rowH = 8;
    const tableH = 8 + rowsPt.length * rowH;
    const statusBoxH = tableH;

    doc.roundedRect(tableX, tableY, tableW, tableH, 3, 3, 'S');
    doc.setFillColor(242, 243, 245);
    doc.rect(tableX, tableY, tableW, 8, 'F');
    doc.setTextColor(45, 45, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Status', tableX + 6, tableY + 5.7);
    doc.text('Quantidade', tableX + tableW - 28, tableY + 5.7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let ry = tableY + 8;
    for (let i = 0; i < rowsPt.length; i += 1) {
      // linhas horizontais
      doc.setDrawColor(232, 236, 240);
      doc.line(tableX, ry, tableX + tableW, ry);
      const midY = ry + 5.6;
      doc.setTextColor(45, 45, 45);
      doc.text(rowsPt[i].label, tableX + 6, midY);
      doc.text(String(rowsPt[i].v), tableX + tableW - 22, midY);
      ry += rowH;
    }
    doc.setDrawColor(232, 236, 240);
    doc.line(tableX, tableY + tableH, tableX + tableW, tableY + tableH);

    // Box STATUS FINAL (verde claro como protótipo)
    doc.setDrawColor(120, 170, 140);
    doc.setFillColor(238, 247, 240);
    doc.roundedRect(statusBoxX, statusBoxY, statusBoxW, statusBoxH, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(35, 35, 35);
    doc.text('STATUS FINAL', statusBoxX + statusBoxW / 2, statusBoxY + 20, { align: 'center' });
    doc.setFontSize(18);
    doc.setTextColor(failed === 0 ? 19 : 214, failed === 0 ? 160 : 67, failed === 0 ? 86 : 67);
    doc.text(failed === 0 ? 'APROVADO' : 'REPROVADO', statusBoxX + statusBoxW / 2, statusBoxY + 32, { align: 'center' });

    // Rodapé (linha + texto)
    const footLineY = cardY + cardH - 18;
    doc.setDrawColor(226, 230, 235);
    doc.setLineWidth(1);
    doc.line(cardX + 10, footLineY, cardX + cardW - 10, footLineY);
    doc.setTextColor(80, 90, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Relatório Gerado em: ' + genDate + ' ' + genTime, cardX + cardW / 2, footLineY + 8, { align: 'center' });
  }

  function drawScenario(doc, row, idx, total){
    const title = 'Cenário ' + (idx+1) + ' de ' + total;
    const subtitle = (row.nomeCenario || '-') + '  |  ' + (row.generatedAt || '-');
    drawHeader(doc, title, subtitle);

    const label = (k,v, y) => {
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(75,85,104);
      doc.text(k + ':', 12, y);
      doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(17,24,39);
      doc.text(String(v ?? '-'), 52, y, { maxWidth: 146 });
    };

    let y = 28;
    label('Identificação', row.nomeCenario || '-', y); y += 8;
    label('CPF', row.cpf || '-', y); y += 8;
    label('Hash', row.hash || '-', y); y += 8;
    label('Success', row.success, y); y += 8;
    label('Status', row.status || '-', y); y += 8;
    label('Status_message', row.statusMessage ?? 'null', y); y += 8;
    label('Arquivo', row.fileName || '-', y); y += 10;

    // JSON/raw não é mais utilizado no PDF (página de cenário).
  }

  async function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  async function gerarRelatorioLikeFerramentaQA(){
    if(!window.jspdf || !window.jspdf.jsPDF){
      alert('Falha ao carregar jsPDF. Verifique conexão com a internet.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const rows = Array.isArray(DASH_ROWS) ? DASH_ROWS : [];
    if(!rows.length){
      alert('Nenhum cenário encontrado nos logs atuais.');
      return;
    }

    // Relatório deve incluir as execuções disponíveis (o projeto mantém 2 logs mais recentes).
    // Ordena em ordem cronológica do mais recente primeiro.
    const ordered = [...rows].sort((a,b)=> String(b.generatedAt||'').localeCompare(String(a.generatedAt||'')));
    const ts = stamp();

    // Um único PDF (multi-páginas) para evitar bloqueio de downloads múltiplos em browsers
    const pdf = new jsPDF({ unit:'mm', format:'a4' });

    // Página 1: Resumo
    drawSummary(pdf, ordered);

    // Página 2: Planilha
    pdf.addPage('a4', 'portrait');
    (function drawSheet(doc, rows){
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentW = w - margin * 2;

      const headerH = 16;
      doc.setFillColor(28,35,42);
      doc.rect(0,0,w,headerH,'F');
      doc.setTextColor(245,250,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(12);
      doc.text('Planilha de Execução — Cenários', margin, 11);
      doc.setFont('helvetica','normal');
      doc.setFontSize(9);
      doc.text('Execuções carregadas (logs atuais)', margin, 15);

      // Colunas (conforme solicitado)
      const cols = [
        { key:'generatedAt', label:'DATA_EXECUÇÃO', w: 28 },
        { key:'nomeCenario', label:'CENÁRIO', w: 50 },
        { key:'statusMessage', label:'STATUS_MESSAGE', w: 36 },
        { key:'statusEsperado', label:'STATUS_ESPERADO', w: 26 },
        { key:'status', label:'STATUS_OBTIDO', w: 22 },
        { key:'statusFinal', label:'STATUS_FINAL', w: 0 }, // resto
      ];
      const fixed = cols.reduce((acc,c)=> acc + (c.w||0), 0);
      cols[cols.length-1].w = Math.max(20, contentW - fixed);

      const top = headerH + 10;
      const headerRowH = 12;
      const rowH = 14;

      const drawHeaderRow = (y) => {
        doc.setFillColor(242,243,245);
        doc.rect(margin, y, contentW, headerRowH, 'F');
        doc.setDrawColor(226,230,235);
        doc.rect(margin, y, contentW, headerRowH, 'S');
        doc.setTextColor(45,45,45);
        doc.setFont('helvetica','bold');
        doc.setFontSize(7.6);
        let x = margin;
        for (const c of cols) {
          // Header em 2 linhas controladas para não "quebrar torto"
          const label = String(c.label ?? '');
          const parts = label.includes('_') ? label.split('_') : [label];
          if (parts.length >= 2 && label.startsWith('STATUS_')) {
            doc.text('STATUS_', x + (c.w / 2), y + 5.0, { align: 'center', maxWidth: c.w - 3 });
            doc.text(parts.slice(1).join('_'), x + (c.w / 2), y + 9.3, { align: 'center', maxWidth: c.w - 3 });
          } else {
            doc.text(label, x + (c.w / 2), y + 7.2, { align: 'center', maxWidth: c.w - 3 });
          }
          x += c.w;
        }
      };

      const statusColors = (st) => {
        const s = norm(st);
        if (s === 'approved') return { bg:[232,247,240], fg:[19,160,86], border:[120,170,140] };
        if (s === 'rejected') return { bg:[253,238,238], fg:[214,67,67], border:[220,150,150] };
        if (s === 'analysis') return { bg:[255,247,232], fg:[232,156,17], border:[235,200,130] };
        if (s === 'pending') return { bg:[241,245,249], fg:[71,85,105], border:[200,210,220] };
        if (s === 'error') return { bg:[253,238,238], fg:[214,67,67], border:[220,150,150] };
        return { bg:[241,245,249], fg:[71,85,105], border:[200,210,220] };
      };

      const statusFinalLabel = (statusObtido) => {
        // No log atual não há "esperado"; STATUS_FINAL segue o padrão do resumo.
        return norm(statusObtido) === 'approved' ? 'APROVADO' : 'REPROVADO';
      };

      let y = top;
      let page = 1;
      const totalPages = () =>
        Math.max(1, Math.ceil(rows.length / Math.max(1, Math.floor((h - (top + 18)) / rowH))));

      drawHeaderRow(y);
      y += headerRowH;

      doc.setFont('helvetica','normal');
      doc.setFontSize(8.3);

      const normalizeCellValue = (value, { nullLabel = '-' } = {}) => {
        if (value === null) return nullLabel;
        if (value === undefined) return '-';
        const s = String(value);
        if (!s.trim()) return '-';
        return s;
      };

      const cellText = (value, x, y, w, opts) => {
        const t = normalizeCellValue(value, opts);
        const lines = doc.splitTextToSize(t, Math.max(1, w - 3)).slice(0, 2);
        doc.text(lines, x + 1.5, y + 6.2, { maxWidth: w - 3 });
      };

      for (let i = 0; i < rows.length; i += 1) {
        if (y + rowH + 14 > h) {
          // footer
          doc.setDrawColor(226,230,235);
          doc.line(margin, h - 14, margin + contentW, h - 14);
          doc.setTextColor(90,90,90);
          doc.setFontSize(8);
          doc.text('Página ' + page + ' de ' + totalPages(), margin + contentW, h - 9, { align:'right' });
          // new page
          doc.addPage('a4', 'portrait');
          page += 1;
          // redraw top header
          doc.setFillColor(28,35,42);
          doc.rect(0,0,w,headerH,'F');
          doc.setTextColor(245,250,255);
          doc.setFont('helvetica','bold');
          doc.setFontSize(12);
          doc.text('Planilha de Execução — Cenários', margin, 11);
          doc.setFont('helvetica','normal');
          doc.setFontSize(9);
          doc.text('Execuções carregadas (logs atuais)', margin, 15);
          doc.setTextColor(17,24,39);
          y = top;
          drawHeaderRow(y);
          y += headerRowH;
          doc.setFont('helvetica','normal');
          doc.setFontSize(8.3);
        }

        // zebra
        if (i % 2 === 0) {
          doc.setFillColor(252,253,255);
          doc.rect(margin, y, contentW, rowH, 'F');
        }
        // Linhas finas da grade (horizontais)
        doc.setDrawColor(220, 226, 234);
        doc.setLineWidth(0.2);
        doc.line(margin, y, margin + contentW, y);

        const r = rows[i] || {};
        let x = margin;

        const cell = (value, width, opts) => {
          doc.setTextColor(45,45,45);
          cellText(value, x, y, width, opts);
          x += width;
        };

        const statusObtido = String(r.status ?? '');
        const statusEsperado =
          r.statusEsperado ??
          r.statusExpected ??
          r.expectedStatus ??
          r.expected ??
          '-';

        cell(r.generatedAt || '', cols[0].w);
        cell(r.nomeCenario || '', cols[1].w);
        // status_message pode vir null no log -> exibir "null" (não vazio)
        cell(r.statusMessage, cols[2].w, { nullLabel: 'null' });
        cell(normalizeCellValue(statusEsperado), cols[3].w);

        // STATUS_OBTIDO pill
        const cObt = statusColors(statusObtido);
        doc.setDrawColor(cObt.border[0],cObt.border[1],cObt.border[2]);
        doc.setLineWidth(0.2);
        doc.setFillColor(cObt.bg[0],cObt.bg[1],cObt.bg[2]);
        const pillPadX = 1.6;
        const pillH = 7.2;
        const pillY = y + (rowH - pillH) / 2;
        doc.roundedRect(x + pillPadX, pillY, cols[4].w - pillPadX * 2, pillH, 3, 3, 'FD');
        doc.setTextColor(cObt.fg[0],cObt.fg[1],cObt.fg[2]);
        doc.setFont('helvetica','bold');
        doc.setFontSize(8.1);
        doc.text(statusObtido, x + cols[4].w / 2, pillY + 4.9, { align:'center' });
        doc.setFont('helvetica','normal');
        doc.setFontSize(8.3);
        x += cols[4].w;

        // STATUS_FINAL pill (APROVADO/REPROVADO)
        const finalLabel = statusFinalLabel(statusObtido);
        const cFinal = statusColors(finalLabel === 'APROVADO' ? 'approved' : 'rejected');
        doc.setDrawColor(cFinal.border[0],cFinal.border[1],cFinal.border[2]);
        doc.setLineWidth(0.2);
        doc.setFillColor(cFinal.bg[0],cFinal.bg[1],cFinal.bg[2]);
        doc.roundedRect(x + pillPadX, pillY, cols[5].w - pillPadX * 2, pillH, 3, 3, 'FD');
        doc.setTextColor(cFinal.fg[0],cFinal.fg[1],cFinal.fg[2]);
        doc.setFont('helvetica','bold');
        doc.setFontSize(8.1);
        doc.text(finalLabel, x + cols[5].w / 2, pillY + 4.9, { align:'center' });
        doc.setFont('helvetica','normal');
        doc.setFontSize(8.3);
        x += cols[5].w;

        // Linhas finas da grade (verticais)
        doc.setDrawColor(220, 226, 234);
        doc.setLineWidth(0.2);
        let vx = margin;
        for (const c of cols) {
          vx += c.w;
          doc.line(vx, y, vx, y + rowH);
        }

        y += rowH;
      }

      // footer last page
      doc.setDrawColor(226,230,235);
      doc.line(margin, h - 14, margin + contentW, h - 14);
      doc.setTextColor(90,90,90);
      doc.setFontSize(8);
      doc.text('Página ' + page + ' de ' + totalPages(), margin + contentW, h - 9, { align:'right' });
      doc.setTextColor(17,24,39);
    })(pdf, ordered);

    // Páginas 3..N: 1 cenário por página
    for(let i=0;i<ordered.length;i++){
      const r = ordered[i];
      pdf.addPage('a4', 'portrait');
      drawScenario(pdf, r, i, ordered.length);
    }

    pdf.save('Relatorio_' + ts + '.pdf');
  }

  const exportBtn = document.getElementById('exportPdf');
  if(exportBtn){
    exportBtn.addEventListener('click', () => {
      try {
        void gerarRelatorioLikeFerramentaQA();
      } catch (e) {
        alert('Falha ao gerar relatório: ' + (e && e.message ? e.message : String(e)));
      }
    });
  }
</script>
</body>
</html>`;
}
