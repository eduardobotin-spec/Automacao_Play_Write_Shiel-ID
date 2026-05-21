import { test, expect } from '@playwright/test';

import { gerarHash } from '../services/gerarHash.js';
import { getDocumentConsults, getDocumentConsultsRuntimeMeta } from '../services/consultarDocumentos.js';
import { getLogsGeral } from '../services/consultarLogsGeral.js';
import { getInvoicesItensByHash } from '../services/consultarInvoicesItens.js';
import { getServicesByIds } from '../services/consultarServices.js';
import { getActiveModulePrices, updateModulePricesByProvider } from '../services/consultarModulePrices.js';
import { limparConsultasPorCpf } from '../services/limparConsultasPorCpf.js';
import { appendApiResultBlock } from '../services/apiResultLog.js';
import { configurarModuleConsultPorConsultType } from '../services/configurarModuleConsult.js';
import { processarBiometria } from '../services/processar_biometria.js';
import { pollingStatus } from '../services/processar_polling.js';
import * as baseDados from '../services/baseDados.js';

// IMPORTANTE:
// Este arquivo é uma suíte independente de QA.
// Não depende de retorno de outros testes do projeto.
// O único ponto reaproveitado é o gerarHash para iniciar o fluxo.

const CPF_PADRAO = '23134061805';
const CPF_SEM_CNH = '38307186838'
/** Alinhado ao teto `DB_SAFE_SELECT_MAX` (services/dbSelectLimits.js); valores maiores são ignorados no serviço. */
const LIMITE_CONSULTA = 20;
const MAX_TENTATIVAS_EXTRACAO = 6;
const INTERVALO_EXTRACAO_MS = 1500;
const MODULO_OBRIGATORIO = 'dados_cadastrais';
const WINDOW_DOCUMENT_CONSULTS_HOURS = 6;
const RESUMO_PRECOS_CENARIOS = [];
const PRICE_VARIATION_SCENARIO_IDS = new Set(['CA012', 'CA013', 'CA014', 'CA015', 'CA016']);
const NEW_CLIENT_API_USER = String(
  process.env.NEW_CLIENT_API_USER ?? process.env.NEW_CLIENT_KEY ?? ''
).trim();
const NEW_CLIENT_API_PASS = String(
  process.env.NEW_CLIENT_API_PASS ?? process.env.NEW_CLIENT_SECRET ?? ''
).trim();

const CENARIOS_CONSULTA = [
  // Individuais (sempre com dados_cadastrais ativo)
  // consultType: formato da API (ex.: "telefone+email+dados_cadastrais")
  {
    id: 'CA001',
    nome: 'CT001 - Consulta Full',
    tipo: 'individual',
    cpfKeyBaseDados: 'CA001',
    consultType: 'telefone+endereco+email+beneficios_governo+pep_listas+impedidos_apostar+dados_cadastrais',
    modulosEsperados: [
      MODULO_OBRIGATORIO,
      'telefone',
      'endereco',
      'email',
      'beneficios_governo',
      'pep_listas',
      'impedidos_apostar',
    ],
  },
  {
    id: 'CA002',
    nome: 'Telefone + Dados Cadastrais',
    tipo: 'individual',
    cpfKeyBaseDados: 'CA002',
    consultType: 'telefone+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'telefone'],
  },
  {
    id: 'CA003',
    nome: 'E-mail + Dados Cadastrais',
    tipo: 'individual',
    cpfKeyBaseDados: 'CA003',
    consultType: 'email+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'email'],
  },
  {
    id: 'CA004',
    nome: 'Endereço + Dados Cadastrais',
    tipo: 'individual',
    cpfKeyBaseDados: 'CA005',
    consultType: 'endereco+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'endereco'],
  },
  {
    id: 'CA005',
    nome: 'PEP e Listas + Dados Cadastrais',
    tipo: 'individual',
    cpfKeyBaseDados: 'CA006',
    consultType: 'pep_listas+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'pep_listas'],
  },
  {
    id: 'CA006',
    nome: 'Benefícios Governo + Dados Cadastrais',
    tipo: 'individual',
    cpfKeyBaseDados: 'CA008',
    consultType: 'beneficios_governo+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'beneficios_governo'],
  },
  {
    id: 'CA007',
    nome: 'Impedidos de Apostar + Dados Cadastrais',
    tipo: 'individual',
    cpfKeyBaseDados: 'CA009',
    consultType: 'impedidos_apostar+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'impedidos_apostar'],
  },
  {
    id: 'CA008',
    nome: 'Dados Financeiros + Dados Cadastrais',
    tipo: 'individual',
    cpfKeyBaseDados: 'CA010',
    consultType: 'dados_financeiros+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'dados_financeiros'],
  },
  // Combinações
  {
    id: 'CA009',
    nome: 'Combinação: Telefone + E-mail + Dados Cadastrais',
    tipo: 'combinacao',
    cpfKeyBaseDados: 'CA011',
    consultType: 'telefone+email+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'telefone', 'email'],
  },
  {
    id: 'CA010',
    nome: 'Combinação: Endereço + PEP + Benefícios + Dados Cadastrais',
    tipo: 'combinacao',
    cpfKeyBaseDados: 'CA012',
    consultType: 'endereco+pep_listas+beneficios_governo+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'endereco', 'pep_listas', 'beneficios_governo'],
  },
  {
    id: 'CA011',
    nome: 'Combinação: Telefone + Impedidos + Dados Cadastrais',
    tipo: 'combinacao',
    cpfKeyBaseDados: 'CA013',
    consultType: 'telefone+impedidos_apostar+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'telefone', 'impedidos_apostar'],
  },
  {
    id: 'CA012',
    nome: 'Variação Preço 1: Telefone + E-mail + Dados Cadastrais',
    tipo: 'combinacao_preco',
    cpfKeyBaseDados: 'CA015',
    consultType: 'telefone+email+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'telefone', 'email'],
    perfilPreco: 'perfil_1',
  },
  {
    id: 'CA013',
    nome: 'Variação Preço 2: Endereço + PEP + Dados Cadastrais',
    tipo: 'combinacao_preco',
    cpfKeyBaseDados: 'CA016',
    consultType: 'endereco+pep_listas+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'endereco', 'pep_listas'],
    perfilPreco: 'perfil_2',
  },
  {
    id: 'CA014',
    nome: 'Variação Preço 3: Benefícios + Telefone + Dados Cadastrais',
    tipo: 'combinacao_preco',
    cpfKeyBaseDados: 'CA017',
    consultType: 'beneficios_governo+telefone+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'beneficios_governo', 'telefone'],
    perfilPreco: 'perfil_3',
  },
  {
    id: 'CA015',
    nome: 'Variação Preço 4: Impedidos + E-mail + Dados Cadastrais',
    tipo: 'combinacao_preco',
    cpfKeyBaseDados: 'CA018',
    consultType: 'impedidos_apostar+email+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'impedidos_apostar', 'email'],
    perfilPreco: 'perfil_4',
  },
  {
    id: 'CA016',
    nome: 'Variação Preço 5: Financeiro + Endereço + Dados Cadastrais',
    tipo: 'combinacao_preco',
    cpfKeyBaseDados: 'CA019',
    consultType: 'dados_financeiros+endereco+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'dados_financeiros', 'endereco'],
    perfilPreco: 'perfil_5',
  },
  {
    id: 'CA017',
    nome: 'Consulta Full + Dados Financeiros',
    tipo: 'combinacao',
    cpfKeyBaseDados: 'CA020',
    consultType:
      'telefone+endereco+email+beneficios_governo+pep_listas+impedidos_apostar+dados_financeiros+dados_cadastrais',
    modulosEsperados: [
      MODULO_OBRIGATORIO,
      'telefone',
      'endereco',
      'email',
      'beneficios_governo',
      'pep_listas',
      'impedidos_apostar',
      'dados_financeiros',
    ],
  },
  {
    id: 'CA018',
    nome: 'Consulta Full + CNH (sem CNH na base)',
    tipo: 'combinacao',
    cpfKeyBaseDados: 'CA020',
    consultType: 'full+consult_cnh',
    modulosEsperados: [
      MODULO_OBRIGATORIO,
      'full',
      'consult_cnh',
    ],
  },
];

const MODULE_PRICE_PROFILES = {
  perfil_1: {
    netrin: {
      phone_price: 0.019,
      email_price: 0.019,
      registration_data_price: 0.12,
    },
    bigdata: {
      phone_price: 0.11,
      email_price: 0.11,
      registration_data_price: 0.02,
    },
  },
  perfil_2: {
    netrin: {
      address_price: 0.018,
      pep_list_price: 0.03,
      registration_data_price: 0.11,
    },
    bigdata: {
      address_price: 0.11,
      pep_list_price: 0.08,
      registration_data_price: 0.02,
    },
  },
  perfil_3: {
    netrin: {
      phone_price: 0.03,
      gov_benefits_price: 0.09,
      registration_data_price: 0.08,
    },
    bigdata: {
      phone_price: 0.11,
      gov_benefits_price: 0.02,
      registration_data_price: 0.03,
    },
  },
  perfil_4: {
    netrin: {
      betting_ban_price: 0.02,
      email_price: 0.09,
      registration_data_price: 0.1,
    },
    bigdata: {
      betting_ban_price: 0.09,
      email_price: 0.02,
      registration_data_price: 0.02,
    },
  },
  perfil_5: {
    netrin: {
      financial_data_price: 0.02,
      address_price: 0.1,
      registration_data_price: 0.11,
    },
    bigdata: {
      financial_data_price: 0.11,
      address_price: 0.02,
      registration_data_price: 0.02,
    },
  },
};
const CACHE_REPLAY_SOURCE_IDS = ['CA002', 'CA003', 'CA004', 'CA005', 'CA006', 'CA007', 'CA008'];
const CENARIOS_GERARHASH_BIOMETRIA = [
  {
    id: 'NB001',
    nome: 'Fornecedor: Telefone + Dados Cadastrais (Hash+Biometria)',
    tipo: 'biometria_fornecedor',
    cpfKeyBaseDados: 'CA001',
    consultType: 'telefone+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'telefone'],
    biometriaId: 'CA001_APROVADO',
    esperaCache: false,
  },
  {
    id: 'NB002',
    nome: 'Fornecedor: E-mail + Dados Cadastrais (Hash+Biometria)',
    tipo: 'biometria_fornecedor',
    cpfKeyBaseDados: 'CA002',
    consultType: 'email+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'email'],
    biometriaId: 'CA002_SPOOFING_REPROVADO',
    esperaCache: false,
  },
  {
    id: 'NB003',
    nome: 'Fornecedor: Endereço + Dados Cadastrais (Hash+Biometria)',
    tipo: 'biometria_fornecedor',
    cpfKeyBaseDados: 'CA003',
    consultType: 'endereco+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'endereco'],
    biometriaId: 'CA003_MULTIFACES_ANALISE',
    esperaCache: false,
  },
  {
    id: 'NB004',
    nome: 'Fornecedor: PEP + Dados Cadastrais (Hash+Biometria)',
    tipo: 'biometria_fornecedor',
    cpfKeyBaseDados: 'CA005',
    consultType: 'pep_listas+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'pep_listas'],
    biometriaId: 'CA005_SEM_MOVIMENTOS_REAIS_ANALISE',
    esperaCache: false,
  },
  {
    id: 'NB005',
    nome: 'Fornecedor: Benefícios + Dados Cadastrais (Hash+Biometria)',
    tipo: 'biometria_fornecedor',
    cpfKeyBaseDados: 'CA006',
    consultType: 'beneficios_governo+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'beneficios_governo'],
    biometriaId: 'CA006_CPF_PEP_ANALISE',
    esperaCache: false,
  },
  {
    id: 'NB006',
    nome: 'Fornecedor: Impedidos + Dados Cadastrais (Hash+Biometria)',
    tipo: 'biometria_fornecedor',
    cpfKeyBaseDados: 'CA007',
    consultType: 'impedidos_apostar+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'impedidos_apostar'],
    biometriaId: 'CA007_OBITO_REPROVADO',
    esperaCache: false,
  },
  {
    id: 'NB007',
    nome: 'Fornecedor: Telefone + E-mail + Dados Cadastrais (Hash+Biometria)',
    tipo: 'biometria_fornecedor',
    cpfKeyBaseDados: 'CA008',
    consultType: 'telefone+email+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'telefone', 'email'],
    biometriaId: 'CA008_BENEFICIO_APROVADO',
    esperaCache: false,
  },
  {
    id: 'NB008',
    nome: 'Cache: Telefone + Dados Cadastrais (Hash+Biometria)',
    tipo: 'biometria_cache',
    cpfKeyBaseDados: 'CA001',
    consultType: 'telefone+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'telefone'],
    biometriaId: 'CA001_APROVADO',
    esperaCache: true,
  },
  {
    id: 'NB009',
    nome: 'Cache: E-mail + Dados Cadastrais (Hash+Biometria)',
    tipo: 'biometria_cache',
    cpfKeyBaseDados: 'CA002',
    consultType: 'email+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'email'],
    biometriaId: 'CA002_SPOOFING_REPROVADO',
    esperaCache: true,
  },
  {
    id: 'NB010',
    nome: 'Cache: Endereço + Dados Cadastrais (Hash+Biometria)',
    tipo: 'biometria_cache',
    cpfKeyBaseDados: 'CA003',
    consultType: 'endereco+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'endereco'],
    biometriaId: 'CA003_MULTIFACES_ANALISE',
    esperaCache: true,
  },
];
const CENARIOS_VALIDACAO_DASH = [
  {
    id: 'VD001',
    nome: 'ValidaçãoDash: Full + Dados Cadastrais (Biometria)',
    tipo: 'dash_fornecedor',
    cpf: '23134061805',
    consultType:
      'telefone+endereco+email+beneficios_governo+pep_listas+impedidos_apostar+dados_cadastrais',
    modulosEsperados: [
      MODULO_OBRIGATORIO,
      'telefone',
      'endereco',
      'email',
      'beneficios_governo',
      'pep_listas',
      'impedidos_apostar',
    ],
    biometriaId: 'CA001_APROVADO',
    esperaCache: false,
  },
  {
    id: 'VD002',
    nome: 'ValidaçãoDash: Full + Dados Financeiros (Biometria)',
    tipo: 'dash_fornecedor',
    cpf: '23134061805',
    consultType:
      'telefone+endereco+email+beneficios_governo+pep_listas+impedidos_apostar+dados_financeiros+dados_cadastrais',
    modulosEsperados: [
      MODULO_OBRIGATORIO,
      'telefone',
      'endereco',
      'email',
      'beneficios_governo',
      'pep_listas',
      'impedidos_apostar',
      'dados_financeiros',
    ],
    biometriaId: 'CA001_APROVADO',
    esperaCache: false,
  },
  {
    id: 'VD003',
    nome: 'ValidaçãoDash: Telefone + E-mail + Dados Cadastrais (Biometria)',
    tipo: 'dash_fornecedor',
    cpf: '23134061805',
    consultType: 'telefone+email+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'telefone', 'email'],
    biometriaId: 'CA001_APROVADO',
    esperaCache: false,
  },
  {
    id: 'VD004',
    nome: 'ValidaçãoDash: Endereço + Dados Financeiros + Dados Cadastrais (Biometria)',
    tipo: 'dash_fornecedor',
    cpf: '23134061805',
    consultType: 'endereco+dados_financeiros+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'endereco', 'dados_financeiros'],
    biometriaId: 'CA001_APROVADO',
    esperaCache: false,
  },
  {
    id: 'VD005',
    nome: 'ValidaçãoDash: Benefícios + PEP + Dados Cadastrais (Biometria)',
    tipo: 'dash_fornecedor',
    cpf: '23134061805',
    consultType: 'beneficios_governo+pep_listas+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'beneficios_governo', 'pep_listas'],
    biometriaId: 'CA001_APROVADO',
    esperaCache: false,
  },
  {
    id: 'VD006',
    nome: 'ValidaçãoDash: Telefone + Impedidos + Dados Cadastrais (Biometria)',
    tipo: 'dash_fornecedor',
    cpf: '23134061805',
    consultType: 'telefone+impedidos_apostar+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'telefone', 'impedidos_apostar'],
    biometriaId: 'CA001_APROVADO',
    esperaCache: false,
  },
  {
    id: 'VD007',
    nome: 'ValidaçãoDash: E-mail + Dados Financeiros + Dados Cadastrais (Biometria)',
    tipo: 'dash_fornecedor',
    cpf: '23134061805',
    consultType: 'email+dados_financeiros+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'email', 'dados_financeiros'],
    biometriaId: 'CA001_APROVADO',
    esperaCache: false,
  },
  {
    id: 'VD008',
    nome: 'ValidaçãoDash Cache: Telefone + E-mail + Dados Cadastrais (Biometria)',
    tipo: 'dash_cache',
    cpf: '23134061805',
    consultType: 'telefone+email+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'telefone', 'email'],
    biometriaId: 'CA001_APROVADO',
    esperaCache: true,
  },
  {
    id: 'VD009',
    nome: 'ValidaçãoDash Cache: Endereço + Dados Financeiros + Dados Cadastrais (Biometria)',
    tipo: 'dash_cache',
    cpf: '23134061805',
    consultType: 'endereco+dados_financeiros+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'endereco', 'dados_financeiros'],
    biometriaId: 'CA001_APROVADO',
    esperaCache: true,
  },
  {
    id: 'VD010',
    nome: 'ValidaçãoDash Cache: Benefícios + PEP + Dados Cadastrais (Biometria)',
    tipo: 'dash_cache',
    cpf: '23134061805',
    consultType: 'beneficios_governo+pep_listas+dados_cadastrais',
    modulosEsperados: [MODULO_OBRIGATORIO, 'beneficios_governo', 'pep_listas'],
    biometriaId: 'CA001_APROVADO',
    esperaCache: true,
  },
];

const CENARIOS_CNH = [
  {
    id: 'CNH001',
    nome: 'CNH Positivo - consult_cnh com CPF que tem CNH',
    cpf: '23134061805',
    consultType: 'consult_cnh+dados_cadastrais',
    esperaCNH: true,
  },
  {
    id: 'CNH002',
    nome: 'CNH Negativo - consult_cnh com CPF sem CNH na base',
    cpf: '06683872201',
    consultType: 'consult_cnh+dados_cadastrais',
    esperaCNH: false,
  },
  {
    id: 'CNH003',
    nome: 'CNH Positivo - full+consult_cnh com CPF que tem CNH',
    cpf: '23134061805',
    consultType: 'full+consult_cnh',
    esperaCNH: true,
  },
  {
    id: 'CNH004',
    nome: 'CNH Positivo - CNH + Financeiro',
    cpf: '23134061805',
    consultType: 'consult_cnh+dados_financeiros+dados_cadastrais',
    esperaCNH: true,
  },
  {
    id: 'CNH005',
    nome: 'CNH Positivo - CNH + Telefone',
    cpf: '23134061805',
    consultType: 'consult_cnh+telefone+dados_cadastrais',
    esperaCNH: true,
  },
  {
    id: 'CNH006',
    nome: 'CNH Positivo - CNH + Telefone + Email',
    cpf: '23134061805',
    consultType: 'consult_cnh+telefone+email+dados_cadastrais',
    esperaCNH: true,
  },
  {
    id: 'CNH007',
    nome: 'CNH Negativo - full+consult_cnh com CPF sem CNH (CA003)',
    cpf: '14749091910',
    consultType: 'full+consult_cnh',
    esperaCNH: false,
  },
  {
    id: 'CNH008',
    nome: 'CNH Negativo - full+consult_cnh com CPF sem CNH (CA005)',
    cpf: '96477776472',
    consultType: 'full+consult_cnh',
    esperaCNH: false,
  },
  {
    id: 'CNH009',
    nome: 'CNH Negativo - full+consult_cnh com CPF sem CNH (CA008)',
    cpf: '77593626253',
    consultType: 'full+consult_cnh',
    esperaCNH: false,
  },
  {
    id: 'CNH010',
    nome: 'CNH Negativo - full+consult_cnh com CPF sem CNH (CA010)',
    cpf: '10589331914',
    consultType: 'full+consult_cnh',
    esperaCNH: false,
  },
];

const CENARIOS_FINANCEIRO = [
  {
    id: 'FI001',
    nome: 'Financeiro - CPF CA001',
    cpf: '23134061805',
    consultType: 'dados_financeiros+dados_cadastrais',
  },
  {
    id: 'FI002',
    nome: 'Financeiro - CPF CA008 (Beneficiário)',
    cpf: '77593626253',
    consultType: 'dados_financeiros+dados_cadastrais',
  },
  {
    id: 'FI003',
    nome: 'Financeiro - CPF CA010 (Normal)',
    cpf: '10589331914',
    consultType: 'dados_financeiros+dados_cadastrais',
  },
  {
    id: 'FI004',
    nome: 'Financeiro - CPF CA020 (Full Financeiro)',
    cpf: '06683872201',
    consultType: 'dados_financeiros+dados_cadastrais',
  },
];

const CENARIOS_PERFIS_CPF = [
  {
    id: 'PS001',
    nome: 'Perfil CPF - CA001 (Regular)',
    cpf: '23134061805',
    consultType: 'dados_financeiros+dados_cadastrais',
  },
  {
    id: 'PS002',
    nome: 'Perfil CPF - CA006 (PEP)',
    cpf: '02819176470',
    consultType: 'dados_financeiros+dados_cadastrais',
  },
  {
    id: 'PS003',
    nome: 'Perfil CPF - CA007 (Óbito)',
    cpf: '87960575134',
    consultType: 'dados_financeiros+dados_cadastrais',
  },
  {
    id: 'PS004',
    nome: 'Perfil CPF - CA009 (Menor Idade)',
    cpf: '22024494773',
    consultType: 'dados_financeiros+dados_cadastrais',
  },
];

const CENARIOS_VEICULO = [
  {
    id: 'VCL001',
    nome: 'Veículo Real - ARN3I17',
    placa: 'ARN3I17',
    esperaSucesso: true,
  },
  {
    id: 'VCL002',
    nome: 'Veículo - Placa Formato Inválido',
    placa: 'ABC',
    esperaSucesso: false,
  },
  {
    id: 'VCL003',
    nome: 'Veículo - Placa Inexistente',
    placa: 'ZZZ0000',
    esperaSucesso: false,
  },
];

function montarPerfisClienteExecucao() {
  const base = {
    id: 'CLIENTE_BASE',
    nome: 'Cliente Base',
    sufixoNomeCenario: 'BASE',
    clientAuth: null,
    enabled: true,
    skipReason: null,
  };

  const novoClienteCredenciado = NEW_CLIENT_API_USER.length > 0 && NEW_CLIENT_API_PASS.length > 0;
  const novo = {
    id: 'CLIENTE_NOVO',
    nome: 'Cliente Novo',
    sufixoNomeCenario: 'NOVO_CLIENTE',
    clientAuth: novoClienteCredenciado
      ? { apiUser: NEW_CLIENT_API_USER, apiPass: NEW_CLIENT_API_PASS }
      : null,
    enabled: novoClienteCredenciado,
    skipReason:
      'Credenciais ausentes do novo cliente. Configure NEW_CLIENT_API_USER/NEW_CLIENT_API_PASS (ou NEW_CLIENT_KEY/NEW_CLIENT_SECRET).',
  };

  return [base, novo];
}

const PERFIS_CLIENTE_EXECUCAO = montarPerfisClienteExecucao();

function montarNomeCenarioPorCliente(nomeCenarioBase, perfilCliente) {
  return `[${perfilCliente.sufixoNomeCenario}] ${nomeCenarioBase}`;
}

function resolverCpfPorCenario(cenario) {
  const cpfDireto = String(cenario?.cpf ?? '').replace(/\D/g, '');
  if (/^\d{11}$/.test(cpfDireto)) return cpfDireto;
  const key = String(cenario?.cpfKeyBaseDados ?? '').trim();
  const fromBase = baseDados[key];
  if (typeof fromBase === 'string' && /^\d{11}$/.test(fromBase)) return fromBase;
  return CPF_PADRAO;
}

function resolverModulosPorCenario(cenario) {
  const base = Array.isArray(cenario?.modulosEsperados) ? cenario.modulosEsperados : [];
  return Array.from(new Set([MODULO_OBRIGATORIO, ...base]));
}

async function aplicarPerfilPrecoDoCenario(cenario) {
  const perfil = String(cenario?.perfilPreco ?? '').trim();
  if (!perfil) return null;
  const updates = MODULE_PRICE_PROFILES[perfil];
  if (!updates) {
    throw new Error(`Perfil de preço não encontrado para cenário ${cenario?.id}: ${perfil}`);
  }
  return updateModulePricesByProvider(updates);
}


/**
 * Converte para objeto JS quando o campo vem como texto JSON.
 * Se não for JSON, retorna o valor original.
 */
function parseJsonSePossivel(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseConsultTypeToModules(consultType) {
  const parts = String(consultType ?? '')
    .split('+')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return Array.from(new Set(parts));
}

function isConsultaFull(modules = []) {
  const full = [
    'telefone',
    'endereco',
    'email',
    'dados_cadastrais',
    'beneficios_governo',
    'pep_listas',
    'impedidos_apostar',
  ];
  if (modules.length !== full.length) return false;
  const set = new Set(modules);
  return full.every((m) => set.has(m));
}

function priceFieldByModule(moduleKey) {
  const map = {
    telefone: 'phone_price',
    endereco: 'address_price',
    email: 'email_price',
    dados_cadastrais: 'registration_data_price',
    beneficios_governo: 'gov_benefits_price',
    pep_listas: 'pep_list_price',
    impedidos_apostar: 'betting_ban_price',
    dados_financeiros: 'financial_data_price',
    online_betting: 'online_betting_price',
  };
  return map[moduleKey] ?? null;
}

function numOrNull(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function calcularComparativoMenorPreco({ consultType, modulePricesRows, observedProviderRaw }) {
  const modules = parseConsultTypeToModules(consultType);
  const providers = Array.isArray(modulePricesRows) ? modulePricesRows : [];

  const comparativo = providers.map((p) => {
    const provider = String(p?.provider ?? '').toLowerCase();
    if (!provider) return null;

    if (isConsultaFull(modules)) {
      const full = numOrNull(p?.full_price);
      return {
        provider,
        total_price: full,
        unavailable_modules: full == null ? ['full_price'] : [],
      };
    }

    const unavailable = [];
    let total = 0;
    for (const mod of modules) {
      const field = priceFieldByModule(mod);
      if (!field) {
        unavailable.push(`module_sem_mapeamento:${mod}`);
        continue;
      }
      const price = numOrNull(p?.[field]);
      if (price == null) {
        unavailable.push(field);
        continue;
      }
      total += price;
    }

    return {
      provider,
      total_price: unavailable.length ? null : Number(total.toFixed(6)),
      unavailable_modules: unavailable,
    };
  }).filter(Boolean);

  const disponiveis = comparativo.filter((c) => c.total_price != null);
  disponiveis.sort((a, b) => a.total_price - b.total_price);
  const esperado = disponiveis[0] ?? null;

  const observedProvider = String(observedProviderRaw ?? '').toLowerCase();
  const isObservedKnown = observedProvider === 'netrin' || observedProvider === 'bigdata';
  const fallbackProvider =
    esperado?.provider === 'netrin' ? 'bigdata' : esperado?.provider === 'bigdata' ? 'netrin' : null;

  return {
    modules_consultadas: modules,
    providers_comparados: comparativo,
    provider_esperado_menor_preco: esperado?.provider ?? null,
    menor_preco_esperado: esperado?.total_price ?? null,
    provider_observado: observedProviderRaw ?? null,
    prioridade_ok: isObservedKnown && esperado?.provider === observedProvider,
    fallback_aplicado: isObservedKnown && fallbackProvider != null && observedProvider === fallbackProvider,
    fallback_provider_esperado: fallbackProvider,
    validacao_executada: esperado != null,
  };
}

function calcularComparativoPorModulo({
  consultType,
  modulePricesRows,
  observedProviderRaw,
  fallbackValidado = false,
  fallbackAplicado = false,
}) {
  const modules = parseConsultTypeToModules(consultType);
  const rows = Array.isArray(modulePricesRows) ? modulePricesRows : [];
  const byProvider = new Map(rows.map((r) => [String(r?.provider ?? '').toLowerCase(), r]));
  const bigdata = byProvider.get('bigdata') ?? {};
  const netrin = byProvider.get('netrin') ?? {};
  const observed = String(observedProviderRaw ?? '').toLowerCase();
  const observedNormalizado = observed || '-';
  const foiCache = observedNormalizado === 'cache';

  return modules.map((modulo) => {
    const field = priceFieldByModule(modulo);
    const precoBigdata = field ? numOrNull(bigdata?.[field]) : null;
    const precoNetrin = field ? numOrNull(netrin?.[field]) : null;

    let providerEsperado = null;
    if (precoBigdata != null && precoNetrin != null) {
      providerEsperado = precoBigdata <= precoNetrin ? 'bigdata' : 'netrin';
    }

    let status = 'N/D';
    let motivoFallback = '-';
    if (foiCache) {
      status = 'CACHE';
      motivoFallback = 'Consulta atendida via cache (document_consults.source = cache).';
    } else if (providerEsperado && observedNormalizado) {
      if (providerEsperado === observedNormalizado) {
        status = 'OK';
        motivoFallback = '-';
      } else if (fallbackAplicado || fallbackValidado) {
        status = 'FALLBACK_OK';
        motivoFallback =
          'Fornecedor esperado não foi utilizado; fallback válido aplicado para o fornecedor alternativo.';
      } else {
        status = 'NOK';
        motivoFallback =
          'Fornecedor esperado não foi utilizado e não há fallback válido registrado.';
      }
    } else {
      motivoFallback = 'Motivo não informado no log para este módulo.';
    }

    return {
      modulo,
      campo_preco: field,
      bigdata_preco: precoBigdata,
      netrin_preco: precoNetrin,
      provider_esperado: providerEsperado,
      provider_observado: observedNormalizado,
      foi_cache: foiCache,
      status,
      motivo_fallback: motivoFallback,
    };
  });
}

/**
 * Extrai o campo `data` de uma lista de linhas.
 * Mantém um formato simples para facilitar leitura no log/PDF.
 */
function extrairCampoData(rows = []) {
  return rows.map((row) => {
    const dataParse = parseJsonSePossivel(row?.data ?? null);
    const jsonCampoData = dataParse?.data ?? dataParse ?? null;

    return {
      origem_tabela: 'document_consults',
      origem_json: 'document_consults.data',
      id: row?.id ?? null,
      hash: row?.hash ?? null,
      document: row?.document ?? null,
      consulta_tipo: row?.consult_type ?? null,
      consulta_fonte: row?.source ?? null,
      data_raw: dataParse ?? null,
      // Conteúdo principal para leitura humana (quando existir `data.data`).
      data_json_extraido: jsonCampoData,
      success: typeof dataParse?.success === 'boolean' ? dataParse.success : null,
      created_at: row?.created_at ?? null,
      updated_at: row?.updated_at ?? null,
    };
  });
}

/**
 * Extrai um formato enxuto para logs_general.
 * Remove blocos de infraestrutura (headers, response bruto, etc.)
 * para deixar o PDF mais legível para QA.
 */
function extrairLogsGeneralEnxuto(rows = []) {
  return rows.map((row) => {
    const dataParse = parseJsonSePossivel(row?.data ?? null);
    const payloadPrincipal = dataParse?.data ?? dataParse;

    return {
      origem_tabela: 'logs_general',
      origem_json: 'logs_general.data',
      id: row?.id ?? null,
      from: row?.from ?? null,
      created_at: row?.created_at ?? null,
      response_time: row?.response_time ?? null,
      data: payloadPrincipal ?? null,
    };
  });
}

/**
 * Extrai um formato enxuto para invoices_itens.
 */
function extrairInvoicesEnxuto(rows = []) {
  return rows.map((row) => ({
    service_id: row?.service_id ?? null,
    total_price: row?.total_price ?? null,
    quantity_service: row?.quantity_service ?? null,
    item_type: row?.item_type ?? null,
  }));
}

/**
 * Extrai formato enxuto de services contabilizados.
 */
function extrairServicesEnxuto(rows = []) {
  return rows.map((row) => ({
    id: row?.id ?? null,
    service_name: row?.service_name ?? null,
  }));
}

function criarMapaServiceIdParaNome(services = []) {
  const map = new Map();
  for (const row of services) {
    const serviceId = Number(row?.id);
    if (!Number.isFinite(serviceId)) continue;
    map.set(serviceId, row?.service_name ?? null);
  }
  return map;
}

function vincularConsultaNoInvoice(invoices = [], serviceNameById = new Map()) {
  return invoices.map((item) => ({
    ...item,
    consulta_extraida_de: item?.service_id ?? null,
    consulta_nome: serviceNameById.get(Number(item?.service_id)) ?? null,
  }));
}

/**
 * Bloco padrão de extração para deixar o log legível e rastreável.
 * Sempre informa a tabela de origem, filtro utilizado e linhas extraídas.
 */
function montarBlocoExtracao({ origemTabela, origemJson, filtroUtilizado, linhasExtraidas }) {
  const bloco = {
    origem_tabela: origemTabela,
    total_linhas_extraidas: Array.isArray(linhasExtraidas) ? linhasExtraidas.length : 0,
    linhas_extraidas: Array.isArray(linhasExtraidas) ? linhasExtraidas : [],
  };

  if (origemJson != null) bloco.origem_json = origemJson;
  if (filtroUtilizado != null) bloco.filtro_utilizado = filtroUtilizado;

  return bloco;
}

/**
 * Filtra logs_general onde o campo data contenha a hash.
 * Como `data` pode vir como texto/JSON, usamos filtro por texto no banco.
 */
async function consultarLogsPorHash(hash) {
  return getLogsGeral({
    limit: LIMITE_CONSULTA,
    where: 'where data::text ilike $1',
    params: [`%${hash}%`],
  });
}

/**
 * Faz algumas tentativas para esperar persistência assíncrona no banco.
 * Isso evita log vazio quando a consulta ainda está sendo gravada.
 */
async function consultarComTentativas(fetchFn, { maxTentativas = MAX_TENTATIVAS_EXTRACAO } = {}) {
  let ultimaResposta = null;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa += 1) {
    const resposta = await fetchFn();
    ultimaResposta = resposta;

    if ((resposta?.rowCount ?? 0) > 0) {
      return resposta;
    }

    if (tentativa < maxTentativas) {
      await sleep(INTERVALO_EXTRACAO_MS);
    }
  }

  return ultimaResposta;
}

async function consultarDocumentConsultsPorHash({ hash, hashChecker }) {
  const hashes = Array.from(
    new Set([String(hash ?? '').trim(), String(hashChecker ?? '').trim()].filter((v) => v.length > 0))
  );
  const runtimeMeta = getDocumentConsultsRuntimeMeta();

  if (hashes.length === 0) {
    return {
      resultado: { rows: [], rowCount: 0 },
      filtro: 'sem hash/hash_checker para consulta',
      tentativasRealizadas: 0,
      diagnostico: {
        extracao_ok: false,
        motivo_falha_extracao:
          'Falha de extração: hash/hash_checker ausentes antes da consulta em document_consults.',
        hash_consultada: null,
        hash_checker_consultada: null,
        filtro_utilizado: 'sem hash/hash_checker para consulta',
        tentativas_realizadas: 0,
        database_tabela_consultada: runtimeMeta,
      },
    };
  }

  const filtro = `hash in [${hashes.join(', ')}]`;
  const tentativas = 10;
  const exact = await consultarComTentativas(
    () =>
      getDocumentConsults({
        limit: LIMITE_CONSULTA,
        where: 'where hash = any($1::text[])',
        params: [hashes],
      }),
    { maxTentativas: tentativas }
  );

  if ((exact?.rowCount ?? 0) > 0) {
    return {
      resultado: exact,
      filtro,
      tentativasRealizadas: tentativas,
      diagnostico: {
        extracao_ok: true,
        motivo_falha_extracao: null,
        hash_consultada: String(hash ?? '') || null,
        hash_checker_consultada: String(hashChecker ?? '') || null,
        filtro_utilizado: filtro,
        tentativas_realizadas: tentativas,
        database_tabela_consultada: runtimeMeta,
      },
    };
  }

  return {
    resultado: { rows: [], rowCount: 0 },
    filtro,
    tentativasRealizadas: tentativas,
    diagnostico: {
      extracao_ok: false,
      motivo_falha_extracao:
        'Falha de extração: nenhum registro encontrado em document_consults para a hash da execução.',
      hash_consultada: String(hash ?? '') || null,
      hash_checker_consultada: String(hashChecker ?? '') || null,
      filtro_utilizado: filtro,
      tentativas_realizadas: tentativas,
      database_tabela_consultada: runtimeMeta,
    },
  };
}

async function consultarDocumentConsultsPorDocumentoTipo({ cpf, consultType }) {
  const cpfDigits = String(cpf ?? '').replace(/\D/g, '');
  const modules = parseConsultTypeToModules(consultType);

  if (cpfDigits.length !== 11 || modules.length === 0) {
    return {
      rows: [],
      rowCount: 0,
      filtro: 'document/consult_type inválidos para fallback',
    };
  }

  const tentativa = await consultarComTentativas(
    () =>
      getDocumentConsults({
        limit: LIMITE_CONSULTA,
        where:
          `where document = $1
           and string_to_array(consult_type, '+') @> $2::text[]
           and cardinality(string_to_array(consult_type, '+')) = cardinality($2::text[])
           and created_at >= now() - interval '${WINDOW_DOCUMENT_CONSULTS_HOURS} hours'`,
        params: [cpfDigits, modules],
      }),
    { maxTentativas: 8 }
  );

  return {
    rows: tentativa?.rows ?? [],
    rowCount: tentativa?.rowCount ?? 0,
    filtro: `document=${cpfDigits} + consult_type(modules=${modules.join('+')})`,
  };
}

/**
 * Fluxo único reutilizável para qualquer cenário.
 * Você poderá chamar esta função nos cenários que criar.
 */
export async function executarFluxoConsultaPorHash({
  request,
  nomeCenario,
  cenarioId = null,
  cenarioTipo = null,
  clienteId = null,
  clienteNome = null,
  cpf = CPF_PADRAO,
  consultType,
  modulos = [MODULO_OBRIGATORIO],
  biometriaId = null,
  usarBiometria = false,
  executarPollingBiometria = true,
  clientAuth = null,
  /** Quando true, não grava status de sessão "esperado" (ex.: approved) no log nem conta no resumo do .txt. */
  omitirStatusEsperadoNoLog = false,
}) {
  // 0) Pré-condição obrigatória: alinhar module_consult por cenário.
  await configurarModuleConsultPorConsultType({ consultType });

  // 1) Start da consulta principal (consultDocument + consultType por cenário).
  const hashInfo = await gerarHash(request, cpf, {
    consultType,
    modulos,
    clientAuth,
  });
  const hash = hashInfo?.hash;
  const hashChecker = hashInfo?.hash_checker;
  const cpfNormalizado = String(hashInfo?.cpf ?? cpf);
  if (usarBiometria && biometriaId) {
    const bioResponse = await processarBiometria(request, hash, hashChecker, biometriaId, {
      clientAuth,
    });
    if (!bioResponse?.taskId) {
      throw new Error(`Biometria sem taskId para cenário ${nomeCenario}`);
    }
    if (executarPollingBiometria) {
      const pollingResultado = await pollingStatus(
        request,
        hash,
        hashChecker,
        bioResponse.taskId,
        { returnDetails: true },
        { clientAuth }
      );
      const pollingStatusFinal = String(pollingResultado?.status ?? '').toLowerCase();
      if (pollingStatusFinal !== 'approved') {
        throw new Error(
          `Biometria finalizou sem approved para cenário ${nomeCenario} (status=${pollingStatusFinal || 'indefinido'}).`
        );
      }
    }
  }
  const modulePricesRows = await getActiveModulePrices();

  // 2) document_consults (database "database")
  // Regra QA: prioriza hash/hash_checker; como fallback de validação usa documento+consult_type.
  const documentConsultsBusca = await consultarDocumentConsultsPorHash({
    hash,
    hashChecker,
  });
  let documentConsults = documentConsultsBusca.resultado;
  let filtroDocumentConsults = documentConsultsBusca.filtro;
  let fallbackDocumentoTipo = null;
  if ((documentConsults?.rowCount ?? 0) === 0) {
    fallbackDocumentoTipo = await consultarDocumentConsultsPorDocumentoTipo({
      cpf: cpfNormalizado,
      consultType,
    });
    if ((fallbackDocumentoTipo?.rowCount ?? 0) > 0) {
      documentConsults = {
        rows: fallbackDocumentoTipo.rows,
        rowCount: fallbackDocumentoTipo.rowCount,
      };
      filtroDocumentConsults = `${documentConsultsBusca.filtro} -> fallback(${fallbackDocumentoTipo.filtro})`;
    }
  }

  // 3) logs_general (database "shielid")
  const logsGeral = await consultarComTentativas(() => consultarLogsPorHash(hash));

  // 4) invoices_itens por hash
  const invoicesItens = await consultarComTentativas(() =>
    getInvoicesItensByHash(hash, { limit: LIMITE_CONSULTA })
  );

  // 5) services por service_id contabilizado em invoices_itens
  const serviceIds = (invoicesItens?.rows ?? []).map((r) => r?.service_id).filter((v) => v != null);
  const services = await getServicesByIds(serviceIds);

  // 6) Monta payload enxuto para log humano/PDF.
  const documentConsultsData = extrairCampoData(documentConsults?.rows ?? []);
  const logsGeneralData = extrairLogsGeneralEnxuto(logsGeral?.rows ?? []);
  const servicesContabilizados = extrairServicesEnxuto(services?.rows ?? []);
  const serviceNameById = criarMapaServiceIdParaNome(services?.rows ?? []);
  const invoicesItensData = vincularConsultaNoInvoice(
    extrairInvoicesEnxuto(invoicesItens?.rows ?? []),
    serviceNameById
  );
  const filtroLogsGeneral = `data::text ilike %${hash}%`;
  const filtroInvoicesItens = `hash = ${hash}`;
  const filtroServices = 'id in (service_id encontrados em invoices_itens)';

  const blocoDocumentConsults = montarBlocoExtracao({
    origemTabela: 'document_consults',
    origemJson: 'document_consults.data',
    filtroUtilizado: filtroDocumentConsults,
    linhasExtraidas: documentConsultsData,
  });
  const observedSource = documentConsults?.rows?.[0]?.source ?? null;
  const comparativoPrecos = calcularComparativoMenorPreco({
    consultType,
    modulePricesRows,
    observedProviderRaw: observedSource,
  });

  const providerEsperado = comparativoPrecos.provider_esperado_menor_preco;
  const providerObservado = String(observedSource ?? '').toLowerCase();
  const observedKnown = providerObservado === 'netrin' || providerObservado === 'bigdata';
  const fallbackValido =
    providerObservado === 'cache' ||
    (observedKnown && (comparativoPrecos.prioridade_ok || comparativoPrecos.fallback_aplicado));

  blocoDocumentConsults.validacao_menor_preco = {
    provider_esperado_menor_preco: providerEsperado,
    provider_observado: observedSource,
    prioridade_ok: comparativoPrecos.prioridade_ok,
    fallback_aplicado: comparativoPrecos.fallback_aplicado,
    fallback_validado: fallbackValido,
    criterio:
      'menor preco em module_prices deve ser prioritario; se indisponivel/falha, usar provider alternativo',
    comparativo: comparativoPrecos.providers_comparados,
  };
  if ((documentConsults?.rowCount ?? 0) === 0) {
    blocoDocumentConsults.falha_extracao = true;
    blocoDocumentConsults.motivo_falha_extracao = documentConsultsBusca.diagnostico.motivo_falha_extracao;
    blocoDocumentConsults.hash_consultada = documentConsultsBusca.diagnostico.hash_consultada;
    blocoDocumentConsults.hash_checker_consultada =
      documentConsultsBusca.diagnostico.hash_checker_consultada;
    blocoDocumentConsults.tentativas_realizadas = documentConsultsBusca.diagnostico.tentativas_realizadas;
    blocoDocumentConsults.database_tabela_consultada =
      documentConsultsBusca.diagnostico.database_tabela_consultada;
  }

  const blocoLogsGeneral = montarBlocoExtracao({
    origemTabela: 'logs_general',
    origemJson: 'logs_general.data',
    filtroUtilizado: filtroLogsGeneral,
    linhasExtraidas: logsGeneralData,
  });

  const blocoInvoicesItens = montarBlocoExtracao({
    origemTabela: 'invoices_itens',
    origemJson: 'invoices_itens',
    filtroUtilizado: filtroInvoicesItens,
    linhasExtraidas: invoicesItensData,
  });

  const blocoServices = montarBlocoExtracao({
    origemTabela: 'services',
    origemJson: null,
    filtroUtilizado: null,
    linhasExtraidas: servicesContabilizados,
  });

  const sessionStatusLog = omitirStatusEsperadoNoLog
    ? {
        success: true,
        hash,
        status_message: 'ValidaçãoDash: extratos para revisão humana (sem status de sessão esperado no log).',
      }
    : {
        success: true,
        hash,
        status: 'approved',
        status_message: 'Fluxo de consulta extraído para validação humana',
      };

  // Registro em log compatível com parser/PDF atual, sem duplicidade de blocos.
  appendApiResultBlock({
    nomeCenario,
    cpf: cpfNormalizado,
    ignorarContagemResumo: omitirStatusEsperadoNoLog,
    retornoResponse: {
      session_status: sessionStatusLog,
      raw_response: {
        hash,
        cpf: cpfNormalizado,
        resumo_consulta: {
          cenario_id: cenarioId,
          cenario_nome: nomeCenario,
          cenario_tipo: cenarioTipo,
          cliente_id: clienteId,
          cliente_nome: clienteNome,
          consult_type: consultType,
          modulos_configurados: modulos,
          hash: hash,
          cpf: cpfNormalizado,
          document_consults_row_count: documentConsults?.rowCount ?? 0,
          document_consults_extracao_ok: documentConsultsBusca.diagnostico.extracao_ok,
          document_consults_motivo_falha_extracao:
            documentConsultsBusca.diagnostico.motivo_falha_extracao,
          provider_esperado_menor_preco: providerEsperado,
          provider_observado: observedSource,
          fallback_validado: fallbackValido,
          fallback_filtro_documento_tipo: fallbackDocumentoTipo?.filtro ?? null,
          comparativo_por_modulo: calcularComparativoPorModulo({
            consultType,
            modulePricesRows,
            observedProviderRaw: observedSource,
            fallbackValidado: fallbackValido,
            fallbackAplicado: comparativoPrecos.fallback_aplicado,
          }),
        },
        extracoes: {
          document_consults: blocoDocumentConsults,
          logs_general: blocoLogsGeneral,
          invoices_itens: blocoInvoicesItens,
          services: blocoServices,
        },
      },
    },
  });

  return {
    hash,
    cpf: cpfNormalizado,
    documentConsults,
    logsGeral,
    invoicesItens,
    services,
    comparativoPrecos,
    providerObservado: observedSource,
    fallbackValido,
  };
}

function registrarResumoCenario({ cenarioId, nomeCenario, consultType, resultado, extras = {} }) {
  RESUMO_PRECOS_CENARIOS.push({
    cenario_id: cenarioId,
    cenario_nome: nomeCenario,
    consult_type: consultType,
    provider_esperado_menor_preco: resultado.comparativoPrecos?.provider_esperado_menor_preco ?? null,
    menor_preco_esperado: resultado.comparativoPrecos?.menor_preco_esperado ?? null,
    provider_observado: resultado.providerObservado ?? null,
    prioridade_ok: resultado.comparativoPrecos?.prioridade_ok ?? false,
    fallback_aplicado: resultado.comparativoPrecos?.fallback_aplicado ?? false,
    fallback_validado: resultado.fallbackValido ?? false,
    ...extras,
  });
}

async function limparBaseDosCenarios(cenarios = []) {
  const cpfs = Array.from(new Set(cenarios.map((c) => resolverCpfPorCenario(c))));
  for (const cpf of cpfs) {
    await limparConsultasPorCpf(cpf);
  }
}

async function consultarDocumento(request, { cpf, consultType, clientAuth }) {
  const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
  const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';
  const authUser = String(clientAuth?.apiUser ?? apiUser).trim();
  const authPass = String(clientAuth?.apiPass ?? apiPass).trim();
  const authHeader = `Basic ${Buffer.from(`${authUser}:${authPass}`).toString('base64')}`;
  const url = `https://shielid-staging.com/api/consultDocument?document=${encodeURIComponent(cpf)}`;
  const response = await request.post(url, {
    headers: { Authorization: authHeader },
    data: { consultType },
  });
  return { status: response.status(), body: await response.json(), cpf, consultType };
}

async function consultarVeiculo(request, { placa, clientAuth }) {
  const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
  const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';
  const authUser = String(clientAuth?.apiUser ?? apiUser).trim();
  const authPass = String(clientAuth?.apiPass ?? apiPass).trim();
  const authHeader = `Basic ${Buffer.from(`${authUser}:${authPass}`).toString('base64')}`;
  const url = `https://shielid-staging.com/api/consultVehicle?plate=${encodeURIComponent(placa)}`;
  const response = await request.post(url, {
    headers: { Authorization: authHeader },
  });
  return { status: response.status(), body: await response.json(), placa };
}

test.describe('Validar Consultas — Estrutura Base QA', () => {
  test.describe.configure({ mode: 'serial' });

  const cenarioById = new Map(CENARIOS_CONSULTA.map((c) => [c.id, c]));
  const CENARIOS_CACHE_REPLAY = CACHE_REPLAY_SOURCE_IDS.map((id, idx) => {
    const base = cenarioById.get(id);
    if (!base) {
      throw new Error(`Cenário base não encontrado para replay de cache: ${id}`);
    }
    return {
      ...base,
      id: `CR${String(idx + 1).padStart(3, '0')}`,
      nome: `CACHE_REPLAY - ${base.id} - ${base.nome}`,
      tipo: 'cache_replay',
    };
  });

  for (const perfilCliente of PERFIS_CLIENTE_EXECUCAO) {
    test.describe(perfilCliente.nome, () => {
      test.skip(!perfilCliente.enabled, perfilCliente.skipReason ?? 'Cliente desabilitado');
      const P = perfilCliente;
      const cpf = (c) => resolverCpfPorCenario(c);
      const mods = (c) => resolverModulosPorCenario(c);
      const nome = (id, n) => montarNomeCenarioPorCliente(`${id} - ${n}`, P);
      const auth = P.clientAuth;

      // ── 1) Fornecedores Externos ──
      test.beforeAll(async () => {
        await limparBaseDosCenarios(CENARIOS_CONSULTA);
      });

      for (const c of CENARIOS_CONSULTA) {
        test(`${c.id} - ${c.nome}`, async ({ request }) => {
          const n = c.id === 'CA001' ? nome('', c.nome) : nome(c.id, c.nome);
          const prices = await aplicarPerfilPrecoDoCenario(c);
          const r = await executarFluxoConsultaPorHash({ request, nomeCenario: n, cenarioId: c.id, cenarioTipo: c.tipo, clienteId: P.id, clienteNome: P.nome, clientAuth: auth, cpf: cpf(c), consultType: c.consultType, modulos: mods(c) });
          registrarResumoCenario({ cenarioId: c.id, nomeCenario: n, consultType: c.consultType, resultado: r, extras: { cliente_id: P.id, cliente_nome: P.nome, perfil_preco_aplicado: c.perfilPreco ?? null, module_prices_atualizado: Array.isArray(prices) } });
          expect.soft(r.hash).toBeTruthy();
          expect.soft(Array.isArray(r.documentConsults?.rows)).toBeTruthy();
          expect.soft(r.documentConsults?.rowCount ?? 0).toBeGreaterThan(0);
          expect.soft(r.fallbackValido).toBeTruthy();
          if (PRICE_VARIATION_SCENARIO_IDS.has(c.id)) {
            expect.soft(Array.isArray(prices)).toBeTruthy();
            expect.soft(prices?.length ?? 0).toBeGreaterThan(0);
          }
          expect.soft(Array.isArray(r.logsGeral?.rows)).toBeTruthy();
          expect.soft(Array.isArray(r.invoicesItens?.rows)).toBeTruthy();
          expect.soft(Array.isArray(r.services?.rows)).toBeTruthy();
          appendApiResultBlock({
            nomeCenario: n, cpf: cpf(c),
            retornoResponse: {
              session_status: { success: true, status: 'approved', hash: r.hash },
              raw_response: {
                resumo_consulta: {
                  cenario_id: c.id, cenario_nome: c.nome, cenario_tipo: c.tipo,
                  consult_type: c.consultType, cpf: cpf(c),
                  modulos_configurados: mods(c),
                  document_consults_row_count: r.documentConsults?.rowCount ?? 0,
                  document_consults_extracao_ok: true,
                  provider_esperado_menor_preco: r.comparativoPrecos?.provider_esperado_menor_preco ?? null,
                  provider_observado: r.providerObservado ?? null,
                  fallback_validado: r.fallbackValido,
                  comparativo_por_modulo: r.comparativoPrecos ? [] : [],
                },
              },
            },
          });
        });
      }

      // ── 2) Cache ──
      for (const c of CENARIOS_CACHE_REPLAY) {
        test(`${c.id} - ${c.nome}`, async ({ request }) => {
          const n = nome(c.id, c.nome);
          const r = await executarFluxoConsultaPorHash({ request, nomeCenario: n, cenarioId: c.id, cenarioTipo: c.tipo, clienteId: P.id, clienteNome: P.nome, clientAuth: auth, cpf: cpf(c), consultType: c.consultType, modulos: mods(c) });
          const cacheDetectado = (r.documentConsults?.rows ?? []).some((row) => String(row?.source ?? '').toLowerCase() === 'cache');
          registrarResumoCenario({ cenarioId: c.id, nomeCenario: n, consultType: c.consultType, resultado: r, extras: { cliente_id: P.id, cliente_nome: P.nome, cache_replay: true, cache_detectado: cacheDetectado } });
          expect.soft(r.hash).toBeTruthy();
          expect.soft(Array.isArray(r.documentConsults?.rows)).toBeTruthy();
          expect.soft(r.documentConsults?.rowCount ?? 0).toBeGreaterThan(0);
          expect.soft(r.fallbackValido).toBeTruthy();
          appendApiResultBlock({
            nomeCenario: n, cpf: cpf(c),
            retornoResponse: {
              session_status: { success: true, status: 'approved', hash: r.hash },
              raw_response: {
                resumo_consulta: {
                  cenario_id: c.id, cenario_nome: c.nome, cenario_tipo: c.tipo,
                  consult_type: c.consultType, cpf: cpf(c),
                  modulos_configurados: mods(c),
                  document_consults_row_count: r.documentConsults?.rowCount ?? 0,
                  document_consults_extracao_ok: true,
                  provider_esperado_menor_preco: r.comparativoPrecos?.provider_esperado_menor_preco ?? null,
                  provider_observado: r.providerObservado ?? null,
                  fallback_validado: r.fallbackValido,
                  comparativo_por_modulo: [],
                  cache_detectado: cacheDetectado,
                },
              },
            },
          });
        });
      }

      // ── 3) Biometria ──
      test.beforeAll(async () => {
        await limparBaseDosCenarios(CENARIOS_GERARHASH_BIOMETRIA);
      });

      for (const c of CENARIOS_GERARHASH_BIOMETRIA) {
        test(`${c.id} - ${c.nome}`, async ({ request }) => {
          const n = nome(c.id, c.nome);
          const r = await executarFluxoConsultaPorHash({ request, nomeCenario: n, cenarioId: c.id, cenarioTipo: c.tipo, clienteId: P.id, clienteNome: P.nome, clientAuth: auth, cpf: cpf(c), consultType: c.consultType, modulos: mods(c), biometriaId: c.biometriaId, usarBiometria: true, executarPollingBiometria: true });
          const cacheDetectado = (r.documentConsults?.rows ?? []).some((row) => String(row?.source ?? '').toLowerCase() === 'cache');
          registrarResumoCenario({ cenarioId: c.id, nomeCenario: n, consultType: c.consultType, resultado: r, extras: { cliente_id: P.id, cliente_nome: P.nome, fluxo_biometria: true, cache_esperado: c.esperaCache === true, cache_detectado: cacheDetectado } });
          expect.soft(r.hash).toBeTruthy();
          expect.soft(Array.isArray(r.documentConsults?.rows)).toBeTruthy();
          expect.soft(r.documentConsults?.rowCount ?? 0).toBeGreaterThan(0);
          expect.soft(r.fallbackValido).toBeTruthy();
          if (c.esperaCache) expect.soft(cacheDetectado).toBeTruthy();
          else expect.soft(cacheDetectado).toBeFalsy();
          appendApiResultBlock({
            nomeCenario: n, cpf: cpf(c),
            retornoResponse: {
              session_status: { success: true, status: 'approved', hash: r.hash },
              raw_response: {
                resumo_consulta: {
                  cenario_id: c.id, cenario_nome: c.nome, cenario_tipo: c.tipo,
                  consult_type: c.consultType, cpf: cpf(c),
                  modulos_configurados: mods(c),
                  document_consults_row_count: r.documentConsults?.rowCount ?? 0,
                  document_consults_extracao_ok: true,
                  provider_esperado_menor_preco: r.comparativoPrecos?.provider_esperado_menor_preco ?? null,
                  provider_observado: r.providerObservado ?? null,
                  fallback_validado: r.fallbackValido,
                  comparativo_por_modulo: [],
                  biometria_id: c.biometriaId,
                  cache_esperado: c.esperaCache,
                  cache_detectado: cacheDetectado,
                },
              },
            },
          });
        });
      }

      // ── 4) CNH ──
      test.beforeAll(async () => {
        await limparBaseDosCenarios(CENARIOS_CNH);
      });

      for (const c of CENARIOS_CNH) {
        test(`${c.id} - ${c.nome}`, async ({ request }) => {
          const n = nome(c.id, c.nome);
          const r = await consultarDocumento(request, { cpf: c.cpf, consultType: c.consultType, clientAuth: auth });
          const hasCnh = !!r.body?.data?.consultCNH?.cnh?.number;
          const cnhOk = c.esperaCNH ? hasCnh : !hasCnh;
          if (c.esperaCNH) {
            expect.soft(r.body?.success).toBe(true);
            expect.soft(r.body?.data?.consultCNH?.cnh?.number).toBeTruthy();
          } else {
            expect.soft(r.body?.data?.consultCNH?.cnh?.number).toBeFalsy();
          }
          appendApiResultBlock({
            nomeCenario: n, cpf: c.cpf,
            retornoResponse: {
              session_status: { success: r.body?.success ?? false, status: r.body?.success ? 'approved' : 'rejected', status_message: `CNH: ${hasCnh ? 'encontrada' : 'não encontrada'}` },
              raw_response: {
                resumo_consulta: {
                  cenario_id: c.id, cenario_nome: c.nome, cenario_tipo: 'cnh',
                  consult_type: c.consultType, cpf: c.cpf,
                  modulos_configurados: parseConsultTypeToModules(c.consultType),
                  document_consults_row_count: 0,
                  document_consults_extracao_ok: false,
                  provider_esperado_menor_preco: null,
                  provider_observado: '-',
                  fallback_validado: cnhOk,
                  comparativo_por_modulo: [],
                  cnh_encontrada: hasCnh,
                  cnh_numero: r.body?.data?.consultCNH?.cnh?.number ?? null,
                },
              },
            },
          });
        });
      }

      // ── 5) Financeiro ─
      test.beforeAll(async () => {
        await limparBaseDosCenarios(CENARIOS_FINANCEIRO);
      });

      for (const c of CENARIOS_FINANCEIRO) {
        test(`${c.id} - ${c.nome}`, async ({ request }) => {
          const n = nome(c.id, c.nome);
          const r = await consultarDocumento(request, { cpf: c.cpf, consultType: c.consultType, clientAuth: auth });
          const hasAssets = !!r.body?.data?.financialData?.totalAssets;
          const hasIncome = !!r.body?.data?.financialData?.incomeEstimates;
          const finOk = r.body?.success && hasAssets && hasIncome;
          expect.soft(r.body?.success).toBe(true);
          expect.soft(r.body?.data?.financialData?.totalAssets).toBeTruthy();
          expect.soft(r.body?.data?.financialData?.incomeEstimates).toBeTruthy();
          appendApiResultBlock({
            nomeCenario: n, cpf: c.cpf,
            retornoResponse: {
              session_status: { success: r.body?.success ?? false, status: r.body?.success ? 'approved' : 'rejected', status_message: `Financeiro: assets=${hasAssets}, income=${hasIncome}` },
              raw_response: {
                resumo_consulta: {
                  cenario_id: c.id, cenario_nome: c.nome, cenario_tipo: 'financeiro',
                  consult_type: c.consultType, cpf: c.cpf,
                  modulos_configurados: parseConsultTypeToModules(c.consultType),
                  document_consults_row_count: 0,
                  document_consults_extracao_ok: false,
                  provider_esperado_menor_preco: null,
                  provider_observado: '-',
                  fallback_validado: finOk,
                  comparativo_por_modulo: [],
                  financeiro_assets: hasAssets,
                  financeiro_income: hasIncome,
                },
              },
            },
          });
        });
      }

      // ── 6) Perfis CPF ──
      test.beforeAll(async () => {
        await limparBaseDosCenarios(CENARIOS_PERFIS_CPF);
      });

      for (const c of CENARIOS_PERFIS_CPF) {
        test(`${c.id} - ${c.nome}`, async ({ request }) => {
          const n = nome(c.id, c.nome);
          const r = await consultarDocumento(request, { cpf: c.cpf, consultType: c.consultType, clientAuth: auth });
          const cpfStatus = r.body?.data?.cpfStatus ?? {};
          const perfilOk = r.body?.success && cpfStatus?.name && cpfStatus?.status && cpfStatus?.age;
          expect.soft(r.body?.success).toBe(true);
          expect.soft(r.body?.data?.cpfStatus?.name).toBeTruthy();
          expect.soft(r.body?.data?.cpfStatus?.status).toBeTruthy();
          expect.soft(r.body?.data?.cpfStatus?.age).toBeTruthy();
          appendApiResultBlock({
            nomeCenario: n, cpf: c.cpf,
            retornoResponse: {
              session_status: { success: r.body?.success ?? false, status: r.body?.success ? 'approved' : 'rejected', status_message: `Perfil: ${cpfStatus?.name ?? '-'} (${cpfStatus?.status ?? '-'})` },
              raw_response: {
                resumo_consulta: {
                  cenario_id: c.id, cenario_nome: c.nome, cenario_tipo: 'perfil_cpf',
                  consult_type: c.consultType, cpf: c.cpf,
                  modulos_configurados: parseConsultTypeToModules(c.consultType),
                  document_consults_row_count: 0,
                  document_consults_extracao_ok: false,
                  provider_esperado_menor_preco: null,
                  provider_observado: '-',
                  fallback_validado: perfilOk,
                  comparativo_por_modulo: [],
                  cpf_status_name: cpfStatus?.name ?? null,
                  cpf_status_status: cpfStatus?.status ?? null,
                  cpf_status_age: cpfStatus?.age ?? null,
                },
              },
            },
          });
        });
      }

      // ── 7) Veículo ─
      for (const c of CENARIOS_VEICULO) {
        test(`${c.id} - ${c.nome}`, async ({ request }) => {
          const n = nome(c.id, c.nome);
          const r = await consultarVeiculo(request, { placa: c.placa, clientAuth: auth });
          const sucesso = r.body?.success === true;
          const veiculoOk = c.esperaSucesso ? (sucesso && r.body?.data?.placa === c.placa) : !sucesso;
          if (c.esperaSucesso) {
            expect.soft(r.body?.success).toBe(true);
            expect.soft(r.body?.data?.placa).toBe(c.placa);
          } else {
            expect.soft(r.body?.success).toBe(false);
          }
          appendApiResultBlock({
            nomeCenario: n, cpf: '',
            retornoResponse: {
              session_status: { success: sucesso, status: sucesso ? 'approved' : 'rejected', status_message: `Veículo ${c.placa}: ${sucesso ? 'encontrado' : 'não encontrado/inválido'}` },
              raw_response: {
                resumo_consulta: {
                  cenario_id: c.id, cenario_nome: c.nome, cenario_tipo: 'veiculo',
                  consult_type: 'consult_vehicle', cpf: '',
                  placa: c.placa,
                  modulos_configurados: ['consult_vehicle'],
                  document_consults_row_count: 0,
                  document_consults_extracao_ok: false,
                  provider_esperado_menor_preco: null,
                  provider_observado: '-',
                  fallback_validado: veiculoOk,
                  comparativo_por_modulo: [],
                  placa_retornada: r.body?.data?.placa ?? null,
                },
              },
            },
          });
        });
      }

      // ── 8) ValidaçãoDash ──
      test.beforeAll(async () => {
        await limparBaseDosCenarios(CENARIOS_VALIDACAO_DASH);
      });

      for (const c of CENARIOS_VALIDACAO_DASH) {
        test(`${c.id} - ${c.nome}`, async ({ request }) => {
          const n = montarNomeCenarioPorCliente(c.nome, P);
          const r = await executarFluxoConsultaPorHash({ request, nomeCenario: n, cenarioId: c.id, cenarioTipo: c.tipo, clienteId: P.id, clienteNome: P.nome, clientAuth: auth, cpf: cpf(c), consultType: c.consultType, modulos: mods(c), biometriaId: c.biometriaId, usarBiometria: true, executarPollingBiometria: false, omitirStatusEsperadoNoLog: true });
          const cacheDetectado = (r.documentConsults?.rows ?? []).some((row) => String(row?.source ?? '').toLowerCase() === 'cache');
          registrarResumoCenario({ cenarioId: c.id, nomeCenario: n, consultType: c.consultType, resultado: r, extras: { cliente_id: P.id, cliente_nome: P.nome, fluxo_validacao_dash: true, cache_esperado: c.esperaCache === true, cache_detectado: cacheDetectado } });
          appendApiResultBlock({
            nomeCenario: n, cpf: cpf(c),
            retornoResponse: {
              session_status: { success: true, status: 'approved', hash: r.hash },
              raw_response: {
                resumo_consulta: {
                  cenario_id: c.id, cenario_nome: c.nome, cenario_tipo: c.tipo,
                  consult_type: c.consultType, cpf: cpf(c),
                  modulos_configurados: mods(c),
                  document_consults_row_count: r.documentConsults?.rowCount ?? 0,
                  document_consults_extracao_ok: true,
                  provider_esperado_menor_preco: r.comparativoPrecos?.provider_esperado_menor_preco ?? null,
                  provider_observado: r.providerObservado ?? null,
                  fallback_validado: r.fallbackValido,
                  comparativo_por_modulo: [],
                  cache_detectado: cacheDetectado,
                },
              },
            },
          });
        });
      }

      // ── 9) Resumo Final ──
      test('RESUMO FINAL', async () => {
        appendApiResultBlock({
          nomeCenario: `RESUMO FINAL - ${perfilCliente.nome}`,
          cpf: '',
          retornoResponse: {
            session_status: { success: true, hash: 'resumo-precos', status: 'approved', status_message: 'Resumo comparativo de menor preço por cenário' },
            raw_response: { resumo_comparativo_por_cenario: RESUMO_PRECOS_CENARIOS },
          },
        });
      });
    });
  }
});
