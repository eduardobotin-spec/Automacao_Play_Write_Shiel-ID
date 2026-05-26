import fs from 'fs';
import path from 'path';

const date = new Date().toISOString();
const counter = { v: 0 };
const uid = () => `id_${String(++counter.v).padStart(5, '0')}`;

const resources = [];

function add(res) {
  if (!res._id) res._id = uid();
  resources.push({ ...res, _createdDate: date, _modifiedDate: date });
}

// ── Workspace ──
const WRK = 'wrk_shieldid';
add({
  _type: 'workspace', _id: WRK,
  name: 'Shield-ID - Consultas API',
  description: 'Exportado automaticamente dos cenários de teste.\nTodas as requests de consulta da API Shield-ID.',
});

// ── Environment ──
const ENV = 'env_staging';
add({
  _type: 'environment', _id: ENV, parentId: WRK,
  name: 'Staging',
  data: {
    base_url: 'https://shielid-staging.com',
    kyc_url: 'https://kyc.shielid-staging.com',
    api_user: '',
    api_pass: '',
    tenant_id: 'D7n4g9InxXWV52UE',
    // baseDados CPFs
    cpf_ca001: '23134061805',
    cpf_ca002: '13186368685',
    cpf_ca003: '14749091910',
    cpf_ca005: '96477776472',
    cpf_ca006: '02819176470',
    cpf_ca007: '87960575134',
    cpf_ca008: '77593626253',
    cpf_ca009: '22024494773',
    cpf_ca010: '10589331914',
    cpf_ca011: '48758837817',
    cpf_ca012: '90801725615',
    cpf_ca013: '05114310151',
    cpf_ca014: '03138195997',
    cpf_ca015: '86893971168',
    cpf_ca016: '01188320343',
    cpf_ca017: '08301587580',
    cpf_ca018: '16369315613',
    cpf_ca019: '04560097283',
    cpf_ca020: '06683872201',
    // CNH CPFs adicionais
    cpf_cnh002: '06683872201',
    cpf_cnh007: '14749091910',
    cpf_cnh008: '96477776472',
    cpf_cnh009: '77593626253',
    cpf_cnh010: '10589331914',
    // Perfis CPF adicionais
    cpf_ps002: '02819176470',
    cpf_ps003: '87960575134',
    cpf_ps004: '22024494773',
    // Placas
    placa_vcl001: 'ARN3I17',
    placa_vcl002: 'ABC',
    placa_vcl003: 'ZZZ0000',
  },
});

// ── Helper: cria request group ──
function grp(id, name, parent, desc) {
  add({ _type: 'request_group', _id: id, parentId: parent, name, description: desc || '' });
  return id;
}

// ── Helper: cria request ──
function req(id, name, parent, method, url, body, headers, auth, desc) {
  const r = {
    _type: 'request',
    _id: id,
    parentId: parent,
    name,
    method,
    url,
    description: desc || '',
    headers: headers || [],
    authentication: auth || {},
    parameters: [],
    body,
  };
  add(r);
  return id;
}

// ── Auth template ──
const BASIC_AUTH = { type: 'basic', username: '{{ _.api_user }}', password: '{{ _.api_pass }}' };

// ── Default headers ──
const JSON_HEADERS = [
  { name: 'Content-Type', value: 'application/json' },
];
const AUTH_HEADER = [
  { name: 'Content-Type', value: 'application/json' },
];

// ── 1. Consultas por CPF (Fornecedores Externos) ──
const CENARIOS_CONSULTA = [
  { id: 'CA001', nome: 'CT001 - Consulta Full', cpfKey: 'cpf_ca001', consultType: 'telefone+endereco+email+beneficios_governo+pep_listas+impedidos_apostar+dados_cadastrais' },
  { id: 'CA002', nome: 'Telefone + Dados Cadastrais', cpfKey: 'cpf_ca002', consultType: 'telefone+dados_cadastrais' },
  { id: 'CA003', nome: 'E-mail + Dados Cadastrais', cpfKey: 'cpf_ca003', consultType: 'email+dados_cadastrais' },
  { id: 'CA004', nome: 'Endereço + Dados Cadastrais', cpfKey: 'cpf_ca005', consultType: 'endereco+dados_cadastrais' },
  { id: 'CA005', nome: 'PEP e Listas + Dados Cadastrais', cpfKey: 'cpf_ca006', consultType: 'pep_listas+dados_cadastrais' },
  { id: 'CA006', nome: 'Benefícios Governo + Dados Cadastrais', cpfKey: 'cpf_ca008', consultType: 'beneficios_governo+dados_cadastrais' },
  { id: 'CA007', nome: 'Impedidos de Apostar + Dados Cadastrais', cpfKey: 'cpf_ca009', consultType: 'impedidos_apostar+dados_cadastrais' },
  { id: 'CA008', nome: 'Dados Financeiros + Dados Cadastrais', cpfKey: 'cpf_ca010', consultType: 'dados_financeiros+dados_cadastrais' },
  { id: 'CA009', nome: 'Combinação: Telefone + E-mail + Dados Cadastrais', cpfKey: 'cpf_ca011', consultType: 'telefone+email+dados_cadastrais' },
  { id: 'CA010', nome: 'Combinação: Endereço + PEP + Benefícios + Dados Cadastrais', cpfKey: 'cpf_ca012', consultType: 'endereco+pep_listas+beneficios_governo+dados_cadastrais' },
  { id: 'CA011', nome: 'Combinação: Telefone + Impedidos + Dados Cadastrais', cpfKey: 'cpf_ca013', consultType: 'telefone+impedidos_apostar+dados_cadastrais' },
  { id: 'CA012', nome: 'Variação Preço 1: Telefone + E-mail + Dados Cadastrais', cpfKey: 'cpf_ca015', consultType: 'telefone+email+dados_cadastrais' },
  { id: 'CA013', nome: 'Variação Preço 2: Endereço + PEP + Dados Cadastrais', cpfKey: 'cpf_ca016', consultType: 'endereco+pep_listas+dados_cadastrais' },
  { id: 'CA014', nome: 'Variação Preço 3: Benefícios + Telefone + Dados Cadastrais', cpfKey: 'cpf_ca017', consultType: 'beneficios_governo+telefone+dados_cadastrais' },
  { id: 'CA015', nome: 'Variação Preço 4: Impedidos + E-mail + Dados Cadastrais', cpfKey: 'cpf_ca018', consultType: 'impedidos_apostar+email+dados_cadastrais' },
  { id: 'CA016', nome: 'Variação Preço 5: Financeiro + Endereço + Dados Cadastrais', cpfKey: 'cpf_ca019', consultType: 'dados_financeiros+endereco+dados_cadastrais' },
  { id: 'CA017', nome: 'Consulta Full + Dados Financeiros', cpfKey: 'cpf_ca020', consultType: 'telefone+endereco+email+beneficios_governo+pep_listas+impedidos_apostar+dados_financeiros+dados_cadastrais' },
  { id: 'CA018', nome: 'Consulta Full + CNH (sem CNH na base)', cpfKey: 'cpf_ca020', consultType: 'full+consult_cnh' },
];

const GRP_CONSULTA = grp('grp_consulta', '1 - Consultas por CPF (Fornecedores Externos)', WRK,
  'Requisições de consulta de documento por CPF.\nEndpoint: POST /api/consultDocument');

for (const c of CENARIOS_CONSULTA) {
  const rid = `req_${c.id}`;
  const url = `{{ _.base_url }}/api/consultDocument?document={{ _.${c.cpfKey} }}`;
  const body = {
    mimeType: 'application/json',
    text: JSON.stringify({ consultType: c.consultType }, null, 2),
  };
  req(rid, `${c.id} - ${c.nome}`, GRP_CONSULTA, 'POST', url, body, JSON_HEADERS, BASIC_AUTH,
    `CPF: {{ _.${c.cpfKey} }}\nconsultType: ${c.consultType}\n\nResposta esperada: 200 com hash e session_status.approved`);
}

// ── 2. Cache Replay ──
const CACHE_SOURCE_IDS = ['CA002', 'CA003', 'CA004', 'CA005', 'CA006', 'CA007', 'CA008'];
const GRP_CACHE = grp('grp_cache', '2 - Cache Replay', WRK,
  'Replay de cache para cenários já consultados anteriormente.\nMesmo endpoint e body das consultas originais.');

for (let i = 0; i < CACHE_SOURCE_IDS.length; i++) {
  const srcId = CACHE_SOURCE_IDS[i];
  const src = CENARIOS_CONSULTA.find((c) => c.id === srcId);
  if (!src) continue;
  const crId = `CR${String(i + 1).padStart(3, '0')}`;
  const rid = `req_${crId}`;
  const url = `{{ _.base_url }}/api/consultDocument?document={{ _.${src.cpfKey} }}`;
  const body = {
    mimeType: 'application/json',
    text: JSON.stringify({ consultType: src.consultType }, null, 2),
  };
  req(rid, `${crId} - CACHE_REPLAY - ${src.id} - ${src.nome}`, GRP_CACHE, 'POST', url, body, JSON_HEADERS, BASIC_AUTH,
    `Cache replay de ${src.id}.\nCPF: {{ _.${src.cpfKey} }}\nconsultType: ${src.consultType}`);
}

// ── 3. CNH ──
const CENARIOS_CNH = [
  { id: 'CNH001', nome: 'CNH Positivo - consult_cnh com CPF que tem CNH', cpf: '23134061805', consultType: 'consult_cnh+dados_cadastrais' },
  { id: 'CNH002', nome: 'CNH Negativo - consult_cnh com CPF sem CNH na base', cpfKey: 'cpf_cnh002', consultType: 'consult_cnh+dados_cadastrais' },
  { id: 'CNH003', nome: 'CNH Positivo - full+consult_cnh com CPF que tem CNH', cpf: '23134061805', consultType: 'full+consult_cnh' },
  { id: 'CNH004', nome: 'CNH Positivo - CNH + Financeiro', cpf: '23134061805', consultType: 'consult_cnh+dados_financeiros+dados_cadastrais' },
  { id: 'CNH005', nome: 'CNH Positivo - CNH + Telefone', cpf: '23134061805', consultType: 'consult_cnh+telefone+dados_cadastrais' },
  { id: 'CNH006', nome: 'CNH Positivo - CNH + Telefone + Email', cpf: '23134061805', consultType: 'consult_cnh+telefone+email+dados_cadastrais' },
  { id: 'CNH007', nome: 'CNH Negativo - full+consult_cnh com CPF sem CNH (CA003)', cpfKey: 'cpf_cnh007', consultType: 'full+consult_cnh' },
  { id: 'CNH008', nome: 'CNH Negativo - full+consult_cnh com CPF sem CNH (CA005)', cpfKey: 'cpf_cnh008', consultType: 'full+consult_cnh' },
  { id: 'CNH009', nome: 'CNH Negativo - full+consult_cnh com CPF sem CNH (CA008)', cpfKey: 'cpf_cnh009', consultType: 'full+consult_cnh' },
  { id: 'CNH010', nome: 'CNH Negativo - full+consult_cnh com CPF sem CNH (CA010)', cpfKey: 'cpf_cnh010', consultType: 'full+consult_cnh' },
];

const GRP_CNH = grp('grp_cnh', '3 - CNH', WRK,
  'Consultas de CNH (Carteira Nacional de Habilitação).');

for (const c of CENARIOS_CNH) {
  const cpfVar = c.cpfKey || `cpf_${c.id.toLowerCase()}`;
  const cpfVal = c.cpf || `{{ _.${cpfVar} }}`;
  const rid = `req_${c.id}`;
  const url = `{{ _.base_url }}/api/consultDocument?document=${cpfVal}`;
  const body = {
    mimeType: 'application/json',
    text: JSON.stringify({ consultType: c.consultType }, null, 2),
  };
  req(rid, `${c.id} - ${c.nome}`, GRP_CNH, 'POST', url, body, JSON_HEADERS, BASIC_AUTH,
    `CNH: ${c.consultType}\nEspera ${c.id.includes('Positivo') ? 'encontrar' : 'NÃO encontrar'} CNH.`);
}

// ── 4. Financeiro ──
const CENARIOS_FINANCEIRO = [
  { id: 'FI001', nome: 'Financeiro - CPF CA001', cpf: '23134061805' },
  { id: 'FI002', nome: 'Financeiro - CPF CA008 (Beneficiário)', cpf: '77593626253' },
  { id: 'FI003', nome: 'Financeiro - CPF CA010 (Normal)', cpf: '10589331914' },
  { id: 'FI004', nome: 'Financeiro - CPF CA020 (Full Financeiro)', cpf: '06683872201' },
];

const GRP_FIN = grp('grp_financeiro', '4 - Financeiro', WRK,
  'Consultas de dados financeiros.');

for (const c of CENARIOS_FINANCEIRO) {
  const rid = `req_${c.id}`;
  const url = `{{ _.base_url }}/api/consultDocument?document=${c.cpf}`;
  const body = {
    mimeType: 'application/json',
    text: JSON.stringify({ consultType: 'dados_financeiros+dados_cadastrais' }, null, 2),
  };
  req(rid, `${c.id} - ${c.nome}`, GRP_FIN, 'POST', url, body, JSON_HEADERS, BASIC_AUTH,
    `Financeiro - CPF: ${c.cpf}`);
}

// ── 5. Perfis CPF ──
const CENARIOS_PERFIS = [
  { id: 'PS001', nome: 'Perfil CPF - CA001 (Regular)', cpf: '23134061805' },
  { id: 'PS002', nome: 'Perfil CPF - CA006 (PEP)', cpfKey: 'cpf_ps002' },
  { id: 'PS003', nome: 'Perfil CPF - CA007 (Óbito)', cpfKey: 'cpf_ps003' },
  { id: 'PS004', nome: 'Perfil CPF - CA009 (Menor Idade)', cpfKey: 'cpf_ps004' },
];

const GRP_PERF = grp('grp_perfis', '5 - Perfis CPF', WRK,
  'Consultas de perfil de CPF (situação cadastral).');

for (const c of CENARIOS_PERFIS) {
  const cpfVal = c.cpfKey ? `{{ _.${c.cpfKey} }}` : c.cpf;
  const rid = `req_${c.id}`;
  const url = `{{ _.base_url }}/api/consultDocument?document=${cpfVal}`;
  const body = {
    mimeType: 'application/json',
    text: JSON.stringify({ consultType: 'dados_financeiros+dados_cadastrais' }, null, 2),
  };
  req(rid, `${c.id} - ${c.nome}`, GRP_PERF, 'POST', url, body, JSON_HEADERS, BASIC_AUTH,
    `Perfil CPF - ${c.nome}`);
}

// ── 6. Veículo ──
const CENARIOS_VEICULO = [
  { id: 'VCL001', nome: 'Veículo Real - ARN3I17', placaKey: 'placa_vcl001' },
  { id: 'VCL002', nome: 'Veículo - Placa Formato Inválido', placaKey: 'placa_vcl002' },
  { id: 'VCL003', nome: 'Veículo - Placa Inexistente', placaKey: 'placa_vcl003' },
];

const GRP_VEIC = grp('grp_veiculo', '6 - Veículo', WRK,
  'Consultas de veículo por placa.\nEndpoint: POST /api/consultVehicle');

for (const c of CENARIOS_VEICULO) {
  const rid = `req_${c.id}`;
  const url = `{{ _.base_url }}/api/consultVehicle?plate={{ _.${c.placaKey} }}`;
  req(rid, `${c.id} - ${c.nome}`, GRP_VEIC, 'POST', url, { mimeType: 'application/json', text: '' },
    [{ name: 'Content-Type', value: 'application/json' }], BASIC_AUTH,
    `Placa: {{ _.${c.placaKey} }}`);
}

// ── 7. Biometria ──
const CENARIOS_BIOMETRIA = [
  { id: 'NB001', nome: 'Fornecedor: Telefone + Dados Cadastrais (Hash+Biometria)', cpfKey: 'cpf_ca001', consultType: 'telefone+dados_cadastrais', biometriaId: 'CA001_APROVADO', tipo: 'biometria_fornecedor' },
  { id: 'NB002', nome: 'Fornecedor: E-mail + Dados Cadastrais (Hash+Biometria)', cpfKey: 'cpf_ca002', consultType: 'email+dados_cadastrais', biometriaId: 'CA002_SPOOFING_REPROVADO', tipo: 'biometria_fornecedor' },
  { id: 'NB003', nome: 'Fornecedor: Endereço + Dados Cadastrais (Hash+Biometria)', cpfKey: 'cpf_ca003', consultType: 'endereco+dados_cadastrais', biometriaId: 'CA003_MULTIFACES_ANALISE', tipo: 'biometria_fornecedor' },
  { id: 'NB004', nome: 'Fornecedor: PEP + Dados Cadastrais (Hash+Biometria)', cpfKey: 'cpf_ca005', consultType: 'pep_listas+dados_cadastrais', biometriaId: 'CA005_SEM_MOVIMENTOS_REAIS_ANALISE', tipo: 'biometria_fornecedor' },
  { id: 'NB005', nome: 'Fornecedor: Benefícios + Dados Cadastrais (Hash+Biometria)', cpfKey: 'cpf_ca006', consultType: 'beneficios_governo+dados_cadastrais', biometriaId: 'CA006_CPF_PEP_ANALISE', tipo: 'biometria_fornecedor' },
  { id: 'NB006', nome: 'Fornecedor: Impedidos + Dados Cadastrais (Hash+Biometria)', cpfKey: 'cpf_ca007', consultType: 'impedidos_apostar+dados_cadastrais', biometriaId: 'CA007_OBITO_REPROVADO', tipo: 'biometria_fornecedor' },
  { id: 'NB007', nome: 'Fornecedor: Telefone + E-mail + Dados Cadastrais (Hash+Biometria)', cpfKey: 'cpf_ca008', consultType: 'telefone+email+dados_cadastrais', biometriaId: 'CA008_BENEFICIO_APROVADO', tipo: 'biometria_fornecedor' },
  { id: 'NB008', nome: 'Cache: Telefone + Dados Cadastrais (Hash+Biometria)', cpfKey: 'cpf_ca001', consultType: 'telefone+dados_cadastrais', biometriaId: 'CA001_APROVADO', tipo: 'biometria_cache' },
  { id: 'NB009', nome: 'Cache: E-mail + Dados Cadastrais (Hash+Biometria)', cpfKey: 'cpf_ca002', consultType: 'email+dados_cadastrais', biometriaId: 'CA002_SPOOFING_REPROVADO', tipo: 'biometria_cache' },
  { id: 'NB010', nome: 'Cache: Endereço + Dados Cadastrais (Hash+Biometria)', cpfKey: 'cpf_ca003', consultType: 'endereco+dados_cadastrais', biometriaId: 'CA003_MULTIFACES_ANALISE', tipo: 'biometria_cache' },
];

const GRP_BIO = grp('grp_biometria', '7 - Biometria', WRK,
  'Fluxo completo de biometria: 1) Gerar Hash → 2) Enviar imagens → 3) Polling status.\n' +
  'Execute as 3 requests em ordem para cada cenário.\n' +
  'As requests de Biometria (passo 2) necessitam que você anexe 6 imagens (CENTER_1.png a CENTER_6.png) manualmente.');

for (const c of CENARIOS_BIOMETRIA) {
  // Subpasta para o cenário
  const subId = `sub_${c.id}`;
  add({ _type: 'request_group', _id: subId, parentId: GRP_BIO, name: `${c.id} - ${c.nome}` });

  // ── 01 - Gerar Hash ──
  const hashId = `req_${c.id}_hash`;
  const hashUrl = `{{ _.base_url }}/api/consultDocument?document={{ _.${c.cpfKey} }}`;
  const hashBody = { mimeType: 'application/json', text: JSON.stringify({ consultType: c.consultType }, null, 2) };
  req(hashId, `01 - ${c.id} - Gerar Hash`, subId, 'POST', hashUrl, hashBody, JSON_HEADERS, BASIC_AUTH,
    `Passo 1/3: Gerar hash da consulta.\nCPF: {{ _.${c.cpfKey} }}\nconsultType: ${c.consultType}\n\nResposta inclui: hash, hash_checker`);

  // ── 02 - Enviar Biometria ──
  const bioId = `req_${c.id}_bio`;
  const bioUrl = `{{ _.kyc_url }}/api/v1/biometry/{{ _.tenant_id }}/{% response 'body', '${hashId}', '$.hash' %}/process-biometry`;
  const bioBody = {
    mimeType: 'multipart/form-data',
    params: [
      { name: 'files', value: '', description: 'CENTER_1.png', id: uid(), type: 'file', fileName: '' },
      { name: 'files', value: '', description: 'CENTER_2.png', id: uid(), type: 'file', fileName: '' },
      { name: 'files', value: '', description: 'CENTER_3.png', id: uid(), type: 'file', fileName: '' },
      { name: 'files', value: '', description: 'CENTER_4.png', id: uid(), type: 'file', fileName: '' },
      { name: 'files', value: '', description: 'CENTER_5.png', id: uid(), type: 'file', fileName: '' },
      { name: 'files', value: '', description: 'CENTER_6.png', id: uid(), type: 'file', fileName: '' },
    ],
  };
  req(bioId, `02 - ${c.id} - Enviar Biometria`, subId, 'POST', bioUrl, bioBody,
    [], BASIC_AUTH,
    `Passo 2/3: Enviar imagens da biometria.\nbiometriaId: ${c.biometriaId}\n\n📌 ATENÇÃO: Anexe 6 arquivos (CENTER_1.png a CENTER_6.png) nos campos "files" abaixo.\nAs imagens estão na pasta: biometria/${c.biometriaId}/`);

  // ── 03 - Polling Status ──
  const pollId = `req_${c.id}_poll`;
  const pollUrl = `{{ _.kyc_url }}/api/v1/kyc/{{ _.tenant_id }}/{% response 'body', '${hashId}', '$.hash' %}/task/{% response 'body', '${bioId}', '$.task_id' %}/status`;
  req(pollId, `03 - ${c.id} - Polling Status`, subId, 'GET', pollUrl, { mimeType: 'application/json', text: '' },
    [{ name: 'tenant-id', value: '{{ _.tenant_id }}' }], BASIC_AUTH,
    `Passo 3/3: Polling do status da biometria.\nAguardar até status "approved" ou "rejected".\n\nResposta: { session_status: { status: "approved"|"rejected"|"analysis" } }`);
}

// ── Export final ──
const exportObj = {
  __export_format: 4,
  __export_date: date,
  __export_source: 'opencode',
  resources,
};

fs.writeFileSync(
  path.join(import.meta.dirname, 'shield-id-insomnia.json'),
  JSON.stringify(exportObj, null, 2),
  'utf-8',
);
console.log('✅ Generated: insominia/shield-id-insomnia.json');
console.log(`   Total resources: ${resources.length}`);
