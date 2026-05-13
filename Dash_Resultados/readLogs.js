import fs from 'fs';
import path from 'path';
import { listLogFiles } from '../services/logParser.js';

export function resolveProjectRoot() {
  return process.cwd();
}

export function resolveLogsDir(projectRoot = resolveProjectRoot()) {
  return path.join(projectRoot, 'logs_txt');
}

function buildPdfHrefFromLogPath(filePath, projectRoot = resolveProjectRoot()) {
  const logsTxtRoot = path.join(projectRoot, 'logs_txt');
  const logsLegacyRoot = path.join(projectRoot, 'logs');

  if (filePath.startsWith(logsTxtRoot)) {
    const rel = path.relative(logsTxtRoot, filePath).replace(/\\/g, '/').replace(/\.txt$/i, '.pdf');
    return `../logs_pdf/${rel}`;
  }
  if (filePath.startsWith(logsLegacyRoot)) {
    const base = path.basename(filePath, '.txt');
    return `../logs_pdf/legacy/${base}.pdf`;
  }
  return `../logs_pdf/${path.basename(filePath, '.txt')}.pdf`;
}

export function readAllLogFiles(logsDir = resolveLogsDir()) {
  const root = resolveProjectRoot();
  const primary = listLogFiles(logsDir);
  const legacyDir = path.join(root, 'logs');
  const legacy = listLogFiles(legacyDir);
  const files = Array.from(new Set([...primary, ...legacy])).sort((a, b) =>
    path.basename(b).localeCompare(path.basename(a))
  );
  return files.map((filePath) => ({
    filePath,
    fileName: path.basename(filePath),
    pdfHref: buildPdfHrefFromLogPath(filePath, root),
    content: fs.readFileSync(filePath, 'utf8'),
  }));
}
