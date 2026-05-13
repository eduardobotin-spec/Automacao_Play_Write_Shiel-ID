import fs from 'fs';
import path from 'path';

const LOG_FILE_RE = /^api-resultados_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.txt$/;

function parseGeneratedAtFromFileName(fileName) {
  const m = fileName.match(LOG_FILE_RE);
  if (!m) return '';
  return `${m[1]} ${m[2]}:${m[3]}:${m[4]}`;
}

function parseJsonObjectAt(content, startIdx) {
  let i = startIdx;
  while (i < content.length && /\s/.test(content[i])) i += 1;
  if (content[i] !== '{') return { value: null, endIndex: startIdx };

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let j = i; j < content.length; j += 1) {
    const ch = content[j];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        const raw = content.slice(i, j + 1);
        try {
          return { value: JSON.parse(raw), endIndex: j + 1 };
        } catch {
          return { value: null, endIndex: j + 1 };
        }
      }
    }
  }

  return { value: null, endIndex: content.length };
}

export function parseLogContent(content, fileName = '') {
  const generatedAt = parseGeneratedAtFromFileName(path.basename(fileName));
  const entries = [];

  const marker = /NOME_CENARIO:\s*(.+)\r?\nCPF:\s*([^\r\n]*)\r?\n\r?\nRETORNO RESPONSE:\r?\n/g;
  let match;

  while ((match = marker.exec(content)) != null) {
    const nomeCenario = String(match[1] ?? '').trim();
    const cpf = String(match[2] ?? '').trim();
    const { value, endIndex } = parseJsonObjectAt(content, marker.lastIndex);
    marker.lastIndex = endIndex;

    const sessionStatus = value?.session_status ?? null;
    entries.push({
      fileName: path.basename(fileName),
      generatedAt,
      nomeCenario,
      cpf,
      hash: sessionStatus?.hash ?? '',
      success: sessionStatus?.success ?? null,
      status: sessionStatus?.status ?? '',
      statusMessage: sessionStatus?.status_message ?? null,
      sessionStatus,
      raw: value,
    });
  }

  return entries;
}

export function listLogFiles(logsDir) {
  if (!fs.existsSync(logsDir)) return [];
  const out = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (LOG_FILE_RE.test(entry.name)) out.push(fullPath);
    }
  };
  walk(logsDir);
  out.sort((a, b) => path.basename(b).localeCompare(path.basename(a)));
  return out;
}

export function parseLogFile(logFilePath) {
  const content = fs.readFileSync(logFilePath, 'utf8');
  return parseLogContent(content, logFilePath);
}
