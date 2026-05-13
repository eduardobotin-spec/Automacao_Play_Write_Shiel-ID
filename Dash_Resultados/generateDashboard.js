import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { readAllLogFiles, resolveLogsDir, resolveProjectRoot } from './readLogs.js';
import { parseDashboardRows } from './parser.js';
import { renderDashboardHtml } from './render.js';

export function generateDashboard() {
  const root = resolveProjectRoot();
  const outDir = path.join(root, 'dash_resultados');
  fs.mkdirSync(outDir, { recursive: true });

  const logs = readAllLogFiles(resolveLogsDir(root));
  const rows = parseDashboardRows(logs);
  const html = renderDashboardHtml(rows);

  const outPath = path.join(outDir, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');
  return outPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const generated = generateDashboard();
  console.log(`Dashboard gerada em: ${generated}`);
}
