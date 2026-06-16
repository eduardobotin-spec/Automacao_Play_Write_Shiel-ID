/**
 * ============================================================
 * BASE DE DADOS — CPFs de teste por cenário
 * ============================================================
 * Este arquivo centraliza os CPFs usados em cada cenário de teste.
 *
 * Regras:
 *   - Cada cenário deve ter um CPF PRÓPRIO e ÚNICO sempre que possível.
 *   - CPFs podem ser sobrescritos via variáveis de ambiente (.env),
 *     o que permite trocar a massa sem alterar o código.
 *   - NUNCA use CPFs de produção ou de pessoas reais como padrão aqui.
 *   - CPFs default são apenas para staging/testes.
 *
 * Como configurar um CPF via .env:
 *   KYC_CPF_PERFIL_APROVADO=00000000000
 *
 * ============================================================
 */


// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Conversão Alta (CA) — Fluxo KYC com biometria
// Cada CA representa um perfil diferente de usuário ou situação de biometria.
// ─────────────────────────────────────────────────────────────────────────────

// CA001 — CPF sem restrições, biometria normal → resultado: approved
export const CA001 = process.env.KYC_CPF_PERFIL_APROVADO || '23134061805';

// CA002 — CPF para cenário de spoofing (foto de foto) → resultado: rejected
export const CA002 = process.env.KYC_CPF_PERFIL_SPOOFING || '13186368685';

// CA003 — CPF com biometria de múltiplas faces → resultado: rejected
export const CA003 = process.env.KYC_CPF_MULTIPLAS_FACES || '14749091910';

// CA005 — CPF com biometria sem movimentos reais (liveness falhou) → resultado: rejected
// NOTA: CA004 não existe nesta suite. Numeração proposital para alinhar com documentação.
export const CA005 = process.env.KYC_CPF_SEM_MOVIMENTOS_REAIS || '96477776472';

// CA006 — CPF de Pessoa Exposta Politicamente (PEP) → resultado: approved | analysis | rejected
export const CA006 = process.env.KYC_CPF_PEP || '02819176470';

// CA007 — CPF com registro de óbito na Receita Federal → resultado: rejected
export const CA007 = process.env.KYC_CPF_OBITO || '87960575134';

// CA008 — CPF de beneficiário (ex.: aposentado, BPC) → resultado: approved | analysis | rejected
export const CA008 = process.env.KYC_CPF_BENEFICIARIO || '77593626253';

// CA009 — CPF de menor de idade → resultado: approved | analysis | rejected (depende do cliente)
export const CA009 = process.env.KYC_CPF_MENOR_IDADE || '22024494773';

// CA010 — CPF normal com biometria sem face identificável → resultado: a definir
// TODO: confirmar se o resultado esperado é 'approved' ou 'rejected' e atualizar o teste
export const CA010 = process.env.KYC_CPF_NORMAL || '10589331914';

// CA011 — CPF para biometria com zoom excessivo → resultado: approved | analysis | rejected
export const CA011 = process.env.KYC_CPF_ZOOM || '48758837817';

// CA012 — CPF para biometria com imagem anime → aguardando massa de testes
// Para ativar: configurar KYC_CPF_ANIME no .env e criar pasta biometria/CA012_ANIME/
export const CA012 = process.env.KYC_CPF_ANIME || '90801725615';

// CA013 — CPF para biometria com imagem em desenho 3D → aguardando massa de testes
export const CA013 = process.env.KYC_CPF_DESENHO_3D || process.env.KYC_CPF_3D || '05114310151';

// CA014 — CPF para biometria com imagem cartoon → aguardando massa de testes
export const CA014 = process.env.KYC_CPF_CARTOON || '03138195997';

// CA015–CA019 — CPFs para variação de preço por módulo (usados em validarConsultas)
export const CA015 = process.env.KYC_CPF_PRECO_VAR_1 || '86893971168';
export const CA016 = process.env.KYC_CPF_PRECO_VAR_2 || '01188320343';
export const CA017 = process.env.KYC_CPF_PRECO_VAR_3 || '08301587580';
export const CA018 = process.env.KYC_CPF_PRECO_VAR_4 || '16369315613';
export const CA019 = process.env.KYC_CPF_PRECO_VAR_5 || '04560097283';

// CA020 — CPF para consulta full com dados financeiros
export const CA020 = process.env.KYC_CPF_FULL_FINANCEIRO || '06683872201';

// Aliases para compatibilidade com testes que referenciam pelo nome do cenário
export const ANIME     = CA012;
export const DESENHO_3D = CA013;
export const CARTOON   = CA014;


// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Equilíbrio (EQ) — Fluxo com documento físico + biometria
// ─────────────────────────────────────────────────────────────────────────────

// EQ001 — CPF sem restrições, documento + biometria válidos → resultado: approved
export const EQ001 = process.env.KYC_CPF_PERFIL_APROVADO || '23134061805';

// EQ002–EQ005 — ATENÇÃO: ainda usando o mesmo CPF do EQ001 (CA001).
// Isso pode causar conflito se os testes rodarem em sequência rápida.
// TODO: substituir por CPFs próprios quando a massa de testes estiver disponível.
// Configurar via .env: KYC_CPF_EQ002, KYC_CPF_EQ003, KYC_CPF_EQ005
export const EQ002 = process.env.KYC_CPF_EQ002 || process.env.KYC_CPF_PERFIL_APROVADO || '23134061805';
export const EQ003 = process.env.KYC_CPF_EQ003 || process.env.KYC_CPF_PERFIL_APROVADO || '23134061805';
export const EQ005 = process.env.KYC_CPF_EQ005 || process.env.KYC_CPF_PERFIL_APROVADO || '23134061805';

// EQ006 — CPF PEP → resultado: approved | analysis | rejected (depende do cliente)
export const EQ006 = process.env.KYC_CPF_PEP || '02819176470';

// EQ007 — CPF com óbito → resultado: rejected
export const EQ007 = process.env.KYC_CPF_OBITO || '87960575134';

// EQ008 — CPF beneficiário → resultado: approved | analysis | rejected (depende do cliente)
export const EQ008 = process.env.KYC_CPF_BENEFICIARIO || '77593626253';

// EQ009 — CPF menor de idade (CPF diferente do CA009 — massa própria)
export const EQ009 = process.env.KYC_CPF_EQ009_MENOR_IDADE || '50231188862';


// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Transacional (LT) — Fluxo de consulta transacional
// ─────────────────────────────────────────────────────────────────────────────

// LT001 — CPF para teste de consulta transacional
export const LT001 = process.env.LT001_CPF_TRANSACIONAL || '23134061805';


// ─────────────────────────────────────────────────────────────────────────────
// 🔹 CPFs de validação negativa
// Usados para testar comportamentos de erro e rejeição de formato.
// ─────────────────────────────────────────────────────────────────────────────

// CPF com dígitos inválidos (falha na validação matemática da Receita Federal).
// Esperado na tela: "CPF inválido. Verifique os dígitos digitados."
export const CPF_INVALIDO_FORMATO = process.env.KYC_CPF_INVALIDO_FORMATO || '00000000000';

// CPF válido no formato mas sem dados cadastrados em nenhum fornecedor.
// Esperado: retorno com campos "Não consta" — sem dados, sem cobrança.
// TODO: confirmar qual CPF de staging garante ausência total de dados.
export const CPF_SEM_DADOS = process.env.KYC_CPF_SEM_DADOS || CA007;
