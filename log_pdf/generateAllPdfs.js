import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { listLogFiles } from '../services/logParser.js';
import { generatePdfFromLog } from './generatePdf.js';

function sortByBaseNameDesc(files) {
  return [...files].sort((a, b) => path.basename(b).localeCompare(path.basename(a)));
}

function collectTxtLogs(projectRoot) {
  const roots = [path.join(projectRoot, 'logs_txt'), path.join(projectRoot, 'logs')];
  const files = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const file of listLogFiles(root)) {
      files.push(file);
    }
  }
  return sortByBaseNameDesc(Array.from(new Set(files)));
}

function resolveArtifactPaths(projectRoot, logFilePath) {
  const resolvedLog = path.resolve(logFilePath);
  const logsTxtRoot = path.resolve(projectRoot, 'logs_txt');
  const logsLegacyRoot = path.resolve(projectRoot, 'logs');
  const baseName = path.basename(logFilePath, '.txt');

  const relToTxt = path.relative(logsTxtRoot, resolvedLog);
  if (relToTxt && !relToTxt.startsWith('..') && !path.isAbsolute(relToTxt)) {
    const relWoExt = relToTxt.replace(/\.txt$/i, '');
    return {
      pdfPath: path.join(projectRoot, 'logs_pdf', `${relWoExt}.pdf`),
      xlsxPath: path.join(projectRoot, 'logs_xlsx', `${relWoExt}.xlsx`),
    };
  }

  const relToLegacy = path.relative(logsLegacyRoot, resolvedLog);
  if (relToLegacy && !relToLegacy.startsWith('..') && !path.isAbsolute(relToLegacy)) {
    return {
      pdfPath: path.join(projectRoot, 'logs_pdf', 'legacy', `${baseName}.pdf`),
      xlsxPath: path.join(projectRoot, 'logs_xlsx', 'legacy', `${baseName}.xlsx`),
    };
  }

  return {
    pdfPath: path.join(projectRoot, 'logs_pdf', `${baseName}.pdf`),
    xlsxPath: path.join(projectRoot, 'logs_xlsx', `${baseName}.xlsx`),
  };
}

export async function generateAllPdfs(projectRoot = process.cwd()) {
  const files = collectTxtLogs(projectRoot).slice(0, 2);
  fs.mkdirSync(path.join(projectRoot, 'logs_pdf'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'logs_xlsx'), { recursive: true });

  const generated = [];
  for (const file of files) {
    const outPaths = await generatePdfFromLog(file, resolveArtifactPaths(projectRoot, file));
    for (const p of outPaths) generated.push(p);
  }
  return generated;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateAllPdfs()
    .then((paths) => {
      console.log(`Arquivos gerados: ${paths.length}`);
      for (const p of paths) console.log(p);
    })
    .catch((err) => {
      console.error('Falha ao gerar PDFs:', err);
      process.exitCode = 1;
    });
}
