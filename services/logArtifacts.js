import path from 'path';
import { spawnSync } from 'child_process';
import fs from 'fs';

function runNodeScript(scriptRelativePath) {
  const scriptPath = path.join(process.cwd(), scriptRelativePath);
  spawnSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    stdio: 'ignore',
    windowsHide: true,
  });
}

export function generateArtifactsForLog(_logFilePath) {
  try {
    runNodeScript(path.join('log_pdf', 'generateAllPdfs.js'));
    const dashboardScript = fs.existsSync(path.join(process.cwd(), 'Dash_Resultados', 'generateDashboard.js'))
      ? path.join('Dash_Resultados', 'generateDashboard.js')
      : path.join('dash_resultados', 'generateDashboard.js');
    runNodeScript(dashboardScript);
  } catch {
    // Não quebrar execução dos testes por falha de artefato.
  }
}
