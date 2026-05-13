import { parseLogContent } from '../services/logParser.js';

export function parseDashboardRows(logFiles) {
  const rows = [];
  for (const file of logFiles) {
    const parsed = parseLogContent(file.content, file.filePath);
    rows.push(...parsed.map((row) => ({ ...row, pdfHref: file.pdfHref })));
  }
  return rows;
}
