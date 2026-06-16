const fs = require('fs');
const path = require('path');

const BRUNO_DIR = path.resolve(__dirname, '..');

const ENV_STAGING = `vars {
  base_url: https://shielid-staging.com
  kyc_url: https://kyc.shielid-staging.com
  tenant_id: D7n4g9InxXWV52UE
  api_user: Homlop0kcQU9sqmSbjvubsI9jchkB0Yg
  api_pass: Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt
  api_key: A7U3519NRYRE3mnO-Jiknh8_ICIv2ZlM4RnXG7jlhR8
  cpf:
  hash:
  task_id:
}
`;

const ENV_MOCK = `vars {
  base_url: http://127.0.0.1:8899
  kyc_url: http://127.0.0.1:8899
  tenant_id: D7n4g9InxXWV52UE
  api_user: u
  api_pass: p
  api_key: mock-key
  cpf:
  hash:
  task_id:
}
`;

// ---- CA scenarios (fluxo de conversão alta) ----
const CA_SCENARIOS = [
  {
    id: 'CA001', folder: 'CA001 - Aprovado',
    cpf: '23134061805', imgDir: 'CA001_APROVADO',
    imgFiles: [1,2,3,4,5,6].map(n => `center_${n}.png`),
    expected: 'approved', assertType: 'exact',
  },
  {
    id: 'CA002', folder: 'CA002 - Reprovado',
    cpf: '13186368685', imgDir: 'CA002_SPOOFING_REPROVADO',
    imgFiles: [1,2,3,4,5,6].map(n => `spoofing_0${n}.png`),
    expected: 'rejected', assertType: 'exact',
  },
  {
    id: 'CA003', folder: 'CA003 - Em Análise',
    cpf: '02819176470', imgDir: 'CA006_CPF_PEP_ANALISE',
    imgFiles: [1,2,3,4,5,6].map(n => `center_${n}.png`),
    expected: ["approved","analysis","rejected"], assertType: 'contains',
  },
];

// ---- GATE scenarios (segurança / tentativa de fraude) ----
const GATE_SCENARIOS = [
  {
    id: 'GATE001', folder: 'GATE001 - Spoofing',
    cpf: '13186368685', imgDir: 'CA002_SPOOFING_REPROVADO',
    imgFiles: [1,2,3,4,5,6].map(n => `spoofing_0${n}.png`),
    expected: 'rejected', assertType: 'exact',
  },
  {
    id: 'GATE002', folder: 'GATE002 - Multifaces',
    cpf: '14749091910', imgDir: 'CA003_MULTIFACES_REPROVADO',
    imgFiles: [1,2,3,4,5,6].map(n => `center_${n}.png`),
    expected: 'rejected', assertType: 'exact',
  },
  {
    id: 'GATE003', folder: 'GATE003 - Sem Movimentos Reais',
    cpf: '96477776472', imgDir: 'CA005_SEM_MOVIMENTOS_REAIS_REPROVADO',
    imgFiles: [1,2,3,4,5,6].map(n => `center_${n}.png`),
    expected: 'rejected', assertType: 'exact',
  },
  {
    id: 'GATE005', folder: 'GATE005 - Sem Faces Identificáveis',
    cpf: '10589331914', imgDir: 'CA010_CPF_NORMAL_SEM_FACES_IDENTIFICAVEIS_REPROVADO',
    imgFiles: [1,2].map(n => `center_${n}.png`),
    expected: 'rejected', assertType: 'exact',
  },
];

// ---- RN scenarios (regras de negócio / impedimento legal) ----
const RN_SCENARIOS = [
  {
    id: 'RN001', folder: 'RN001 - Óbito',
    cpf: '87960575134', imgDir: 'CA007_OBITO_REPROVADO',
    imgFiles: [1,2,3,4,5,6].map(n => `center_${n}.png`),
    expected: 'rejected', assertType: 'exact',
  },
  {
    id: 'RN002', folder: 'RN002 - Menor Idade',
    cpf: '50231188862', imgDir: 'EQ009_MENOR_IDADE',
    imgFiles: [1,2,3,4,5,6].map(n => `CENTER_${n}.jpeg`),
    expected: ["approved","analysis","rejected"], assertType: 'contains',
  },
  {
    id: 'RN003', folder: 'RN003 - CPF PEP',
    cpf: '02819176470', imgDir: 'CA006_CPF_PEP_ANALISE',
    imgFiles: [1,2,3,4,5,6].map(n => `center_${n}.png`),
    expected: ["approved","analysis","rejected"], assertType: 'contains',
  },
  {
    id: 'RN004', folder: 'RN004 - Benefício',
    cpf: '77593626253', imgDir: 'CA008_BENEFICIO_APROVADO',
    imgFiles: [1,2].map(n => `center_${n}.png`),
    expected: ["approved","analysis","rejected"], assertType: 'contains',
  },
];

// ---- DF scenarios (documento físico - variações de dano/informação) ----
// TODO: adicionar CPFs e imagens de documento danificado, info faltando, ilegível
const DF_SCENARIOS = [];

// ---- DD scenarios (documento digital - com/sem selo ICP) ----
// TODO: adicionar CPFs e arquivos de documento digital
const DD_SCENARIOS = [];

// ---- Templates ----

function gerarHashBru(cenario) {
  const prefix = cenario.id.toLowerCase();
  return `meta {
  name: 1. Gerar Hash
  type: http
  seq: 1
}

post {
  url: {{base_url}}/api/getNewHashKYC?documentExpected={{cpf}}
  body: none
  auth: basic
}

auth:basic {
  username: {{api_user}}
  password: {{api_pass}}
}

headers {
  Content-Type: application/json
}

script:pre-request {
  bru.setVar("cpf", "${cenario.cpf}");
}

script:post-response {
  const body = res.getBody();
  let hash = body?.hash ?? body?.data?.hash ?? null;
  if (!hash) {
    const url = body?.url ?? body?.redirectUrl ?? body?.data?.url ?? null;
    if (url) hash = url.split('/').pop().split('?')[0];
  }
  if (hash) {
    bru.setVar("${prefix}_hash", hash);
  } else {
    console.error("[${cenario.id}] Hash não encontrado:", JSON.stringify(body));
  }
}

tests {
  test("Status 200", function() {
    expect(res.getStatus()).to.equal(200);
  });
  test("Hash presente", function() {
    const body = res.getBody();
    let hash = body?.hash ?? body?.data?.hash ?? null;
    expect(hash).to.not.be.null;
  });
}
`;
}

function enviarBiometriaBru(cenario) {
  const prefix = cenario.id.toLowerCase();
  const files = cenario.imgFiles.map(f =>
    `  files: @file(_biometria/${cenario.imgDir}/${f})`
  ).join('\n');

  return `meta {
  name: 2. Enviar Biometria
  type: http
  seq: 2
}

post {
  url: {{kyc_url}}/api/v1/biometry/{{tenant_id}}/{{hash}}/process-biometry
  body: multipartForm
}

headers {
  tenant-id: {{tenant_id}}
  x-api-key: {{api_key}}
}

body:multipart-form {
${files}
}

script:pre-request {
  bru.setVar("hash", bru.getVar("${prefix}_hash"));
}

script:post-response {
  const body = res.getBody();
  const taskId = body?.task_id ?? body?.taskId ?? body?.data?.task_id ?? null;
  if (taskId) {
    bru.setVar("${prefix}_task_id", taskId);
  } else {
    console.error("[${cenario.id}] task_id não encontrado:", JSON.stringify(body));
  }
}

tests {
  test("Status 200 ou 202", function() {
    expect([200, 202]).to.include(res.getStatus());
  });
  test("task_id presente", function() {
    const body = res.getBody();
    const taskId = body?.task_id ?? body?.taskId ?? body?.data?.task_id ?? null;
    expect(taskId).to.not.be.null;
  });
}
`;
}

function pollingStatusBru(cenario) {
  const prefix = cenario.id.toLowerCase();
  let assertion;
  if (cenario.assertType === 'exact') {
    assertion = `  test("${cenario.id} -> ${cenario.expected}", function() {
    expect(bru.getVar("${prefix}_status")).to.equal("${cenario.expected}");
  });`;
  } else {
    const statuses = cenario.expected.map(s => `"${s}"`).join(", ");
    assertion = `  test("${cenario.id} -> status flexivel", function() {
    expect([${statuses}]).to.include(bru.getVar("${prefix}_status"));
  });`;
  }

  return `meta {
  name: 3. Polling Status
  type: http
  seq: 3
}

get {
  url: {{kyc_url}}/api/v1/kyc/{{tenant_id}}/{{hash}}/task/{{task_id}}/status
  body: none
}

headers {
  tenant-id: {{tenant_id}}
  x-api-key: {{api_key}}
}

script:pre-request {
  bru.setVar("hash", bru.getVar("${prefix}_hash"));
  bru.setVar("task_id", bru.getVar("${prefix}_task_id"));
}

script:post-response {
  const finais = ["approved", "rejected", "error", "analysis"];
  const url = bru.getEnvVar("kyc_url") + "/api/v1/kyc/" + bru.getEnvVar("tenant_id")
    + "/" + bru.getVar("hash") + "/task/" + bru.getVar("task_id") + "/status";
  const axios = require('axios');

  let body = res.getBody();
  let status = body?.session_status?.status ?? null;
  let mensagem = body?.session_status?.status_message ?? null;

  for (let i = 0; i < 12 && !finais.includes(status); i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const r = await axios.get(url, {
      headers: { "tenant-id": bru.getEnvVar("tenant_id"), "x-api-key": bru.getEnvVar("api_key") }
    });
    body = r.data;
    status = body?.session_status?.status ?? null;
    mensagem = body?.session_status?.status_message ?? null;
  }

  bru.setVar("${prefix}_status", status);
  bru.setVar("${prefix}_msg", mensagem);
}

tests {
  test("Status 200", function() {
    expect(res.getStatus()).to.equal(200);
  });
${assertion}
}
`;
}

// ---- EQ extra: Enviar Documento ----
function enviarDocumentoBru(cenario, seq) {
  const prefix = cenario.id.toLowerCase();
  return `meta {
  name: ${seq}. Enviar Documento Frente
  type: http
  seq: ${seq}
}

post {
  url: {{kyc_url}}/api/v1/kyc/{{tenant_id}}/{{hash}}/process-document
  body: multipartForm
}

headers {
  tenant-id: {{tenant_id}}
  x-api-key: {{api_key}}
}

body:multipart-form {
  document_side: front
  document_image: @file(_documento_fisico/${cenario.docDir}/frente.jpeg)
}

script:pre-request {
  bru.setVar("hash", bru.getVar("${prefix}_hash"));
}

script:post-response {
  console.log("[${cenario.id}] Documento frente enviado:", res.getStatus());
  if (res.getStatus() !== 200) {
    console.error("[${cenario.id}] Erro frente:", JSON.stringify(res.getBody()));
  }
}

tests {
  test("Status 200", function() {
    expect(res.getStatus()).to.equal(200);
  });
}
`;
}

function enviarDocumentoVersoBru(cenario, seq) {
  const prefix = cenario.id.toLowerCase();
  return `meta {
  name: ${seq}. Enviar Documento Verso
  type: http
  seq: ${seq}
}

post {
  url: {{kyc_url}}/api/v1/kyc/{{tenant_id}}/{{hash}}/process-document
  body: multipartForm
}

headers {
  tenant-id: {{tenant_id}}
  x-api-key: {{api_key}}
}

body:multipart-form {
  document_side: back
  document_image: @file(_documento_fisico/${cenario.docDir}/verso.jpeg)
}

script:pre-request {
  bru.setVar("hash", bru.getVar("${prefix}_hash"));
  await new Promise(resolve => setTimeout(resolve, 3000));
}

script:post-response {
  const body = res.getBody();
  console.log("[${cenario.id}] Documento verso enviado:", res.getStatus());
  if (res.getStatus() !== 200) {
    console.error("[${cenario.id}] Erro verso:", JSON.stringify(body));
  }
}

tests {
  test("Status 200", function() {
    expect(res.getStatus()).to.equal(200);
  });
}
`;
}

// ---- Validacao - Autenticacao (cenarios SEM x-api-key) ----

function valicAuthGerarHashBru() {
  return `meta {
  name: 1. Gerar Hash
  type: http
  seq: 1
}

post {
  url: {{base_url}}/api/getNewHashKYC?documentExpected=23134061805
  body: none
  auth: basic
}

auth:basic {
  username: {{api_user}}
  password: {{api_pass}}
}

headers {
  Content-Type: application/json
}

script:post-response {
  const body = res.getBody();
  let hash = body?.hash ?? body?.data?.hash ?? null;
  if (!hash) {
    const url = body?.url ?? body?.redirectUrl ?? body?.data?.url ?? null;
    if (url) hash = url.split('/').pop().split('?')[0];
  }
  if (hash) bru.setVar("hash", hash);
}

tests {
  test("Status 200", function() {
    expect(res.getStatus()).to.equal(200);
  });
}
`;
}

function valicAuthSemChaveBru(tipo) {
  const isBiometria = tipo === 'biometria';
  const nome = isBiometria ? 'Enviar Biometria' : 'Enviar Documento';
  const method = isBiometria ? 'post' : 'post';
  const endpoint = isBiometria
    ? '/api/v1/biometry/{{tenant_id}}/{{hash}}/process-biometry'
    : '/api/v1/kyc/{{tenant_id}}/{{hash}}/process-document';
  const bodyMultipart = isBiometria
    ? 'body:multipart-form {\n  files: @file(_biometria/CA001_APROVADO/center_1.png)\n}'
    : 'body:multipart-form {\n  document_side: front\n  document_image: @file(_documento_fisico/EQ001_APROVADO/frente.jpeg)\n}';

  return `meta {
  name: 2. ${nome} (sem x-api-key)
  type: http
  seq: 2
}

${method} {
  url: {{kyc_url}}${endpoint}
  body: multipartForm
}

headers {
  tenant-id: {{tenant_id}}
}

body:multipart-form {
${bodyMultipart}
}

tests {
  test("Falha com 401", function() {
    expect(res.getStatus()).to.equal(401);
  });
}
`;
}

function generateValidacaoAuth() {
  const dir = path.join(BRUNO_DIR, 'Validacao - Autenticacao');
  fs.mkdirSync(dir, { recursive: true });

  // Fluxo CA: Gerar Hash → Biometria (sem x-api-key)
  const bioDir = path.join(dir, '01. Fluxo CA (biometria sem chave)');
  fs.mkdirSync(bioDir, { recursive: true });
  cleanDir(bioDir);
  fs.writeFileSync(path.join(bioDir, '1. Gerar Hash.bru'), valicAuthGerarHashBru());
  fs.writeFileSync(path.join(bioDir, '2. Enviar Biometria.bru'), valicAuthSemChaveBru('biometria'));
  console.log('[VALID] Fluxo CA (biometria sem chave) — OK');

  // Fluxo EQ: Gerar Hash → Documento (sem x-api-key)
  const docDir = path.join(dir, '02. Fluxo EQ (documento sem chave)');
  fs.mkdirSync(docDir, { recursive: true });
  cleanDir(docDir);
  fs.writeFileSync(path.join(docDir, '1. Gerar Hash.bru'), valicAuthGerarHashBru());
  fs.writeFileSync(path.join(docDir, '2. Enviar Documento.bru'), valicAuthSemChaveBru('documento'));
  console.log('[VALID] Fluxo EQ (documento sem chave) — OK');
}

// ---- GATE templates ----

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isFile() && f.endsWith('.bru')) {
        fs.unlinkSync(p);
      }
    }
  }
}

function generateCAScenarios() {
  const caDir = path.join(BRUNO_DIR, 'CA - Conversão Alta');

  for (const c of CA_SCENARIOS) {
    const dir = path.join(caDir, c.folder);
    fs.mkdirSync(dir, { recursive: true });
    cleanDir(dir);

    fs.writeFileSync(path.join(dir, '1. Gerar Hash.bru'), gerarHashBru(c));
    fs.writeFileSync(path.join(dir, '2. Enviar Biometria.bru'), enviarBiometriaBru(c));
    fs.writeFileSync(path.join(dir, '3. Polling Status.bru'), pollingStatusBru(c));
    console.log(`[CA] ${c.folder} — OK`);
  }
}

function generateGATEScenarios() {
  const gateDir = path.join(BRUNO_DIR, 'GATE - Segurança');

  for (const c of GATE_SCENARIOS) {
    const dir = path.join(gateDir, c.folder);
    fs.mkdirSync(dir, { recursive: true });
    cleanDir(dir);

    fs.writeFileSync(path.join(dir, '1. Gerar Hash.bru'), gerarHashBru(c));
    fs.writeFileSync(path.join(dir, '2. Enviar Biometria.bru'), enviarBiometriaBru(c));
    fs.writeFileSync(path.join(dir, '3. Polling Status.bru'), pollingStatusBru(c));
    console.log(`[GATE] ${c.folder} — OK`);
  }
}

function generateRNScenarios() {
  const rnDir = path.join(BRUNO_DIR, 'RN - Regra de Negócio');

  for (const c of RN_SCENARIOS) {
    const dir = path.join(rnDir, c.folder);
    fs.mkdirSync(dir, { recursive: true });
    cleanDir(dir);

    fs.writeFileSync(path.join(dir, '1. Gerar Hash.bru'), gerarHashBru(c));
    fs.writeFileSync(path.join(dir, '2. Enviar Biometria.bru'), enviarBiometriaBru(c));
    fs.writeFileSync(path.join(dir, '3. Polling Status.bru'), pollingStatusBru(c));
    console.log(`[RN] ${c.folder} — OK`);
  }
}

function generateDFScenarios() {
  const dfDir = path.join(BRUNO_DIR, 'Documento Físico - Validação');
  fs.mkdirSync(dfDir, { recursive: true });

  if (DF_SCENARIOS.length === 0) {
    const readme = `meta {
  name: TBD - Adicionar cenários
  type: http
  seq: 1
}

get {
  url: {{base_url}}/
  body: none
}

tests {
  test("Placeholder", function() {
    expect(true).to.equal(true);
  });
}
`;
    fs.writeFileSync(path.join(dfDir, 'TBD - Adicionar cenários.bru'), readme);
    console.log('[DF] Nenhum cenário definido ainda. Edite DF_SCENARIOS no gerador.');
  }
}

function generateDDScenarios() {
  const ddDir = path.join(BRUNO_DIR, 'Documento Digital - Validação');
  fs.mkdirSync(ddDir, { recursive: true });

  if (DD_SCENARIOS.length === 0) {
    const readme = `meta {
  name: TBD - Adicionar cenários
  type: http
  seq: 1
}

get {
  url: {{base_url}}/
  body: none
}

tests {
  test("Placeholder", function() {
    expect(true).to.equal(true);
  });
}
`;
    fs.writeFileSync(path.join(ddDir, 'TBD - Adicionar cenários.bru'), readme);
    console.log('[DD] Nenhum cenário definido ainda. Edite DD_SCENARIOS no gerador.');
  }
}

function generateEnvironments() {
  fs.writeFileSync(path.join(BRUNO_DIR, 'environments', 'staging.bru'), ENV_STAGING);
  fs.writeFileSync(path.join(BRUNO_DIR, 'environments', 'mock.bru'), ENV_MOCK);
  console.log('[ENV] environments — OK');
}

function generateDirStructure() {
  const dirs = [
    '_biometria/fixtures',
    '_biometria/mocks',
    '_biometria/scripts',
    '_documento_fisico/fixtures',
    'scripts',
    'reports',
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(BRUNO_DIR, d), { recursive: true });
  }
  console.log('[DIR] Estrutura de diretórios — OK');
}

// ---- Run ----
console.log('=== Gerando cenários Bruno ===\n');
generateEnvironments();
generateDirStructure();
generateCAScenarios();
generateGATEScenarios();
generateRNScenarios();
generateDFScenarios();
generateDDScenarios();
generateValidacaoAuth();
console.log('\n=== Geração concluída ===');
