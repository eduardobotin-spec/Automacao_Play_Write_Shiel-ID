import { appendApiResultBlock } from './apiResultLog.js';

const KYC_API = 'https://kyc.shielid-staging.com';
const TENANT_ID = 'D7n4g9InxXWV52UE';

const apiUser = process.env.API_USER || 'Homlop0kcQU9sqmSbjvubsI9jchkB0Yg';
const apiPass = process.env.API_PASS || 'Q1pZOxntMCfAzXn0UKIH4tKIMkVp2pxt';

function basicAuthHeader(clientAuth = null) {
  const authUser = String(clientAuth?.apiUser ?? apiUser).trim();
  const authPass = String(clientAuth?.apiPass ?? apiPass).trim();
  return `Basic ${Buffer.from(`${authUser}:${authPass}`).toString('base64')}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldWriteLog(logCtx) {
  return logCtx?.nomeCenario;
}

function extrairCpfFromBody(body) {
  const fromSession =
    body?.session_status?.document_expected ??
    body?.data?.session_status?.document_expected ??
    body?.response?.session_status?.document_expected;

  return String(fromSession ?? '').replace(/\D/g, '');
}

function extrairStatusMessageFromBody(body) {
  const msg =
    body?.session_status?.status_message ??
    body?.data?.session_status?.status_message ??
    body?.response?.session_status?.status_message ??
    body?.status_message ??
    body?.message ??
    null;

  return typeof msg === 'string' || msg == null ? msg : String(msg);
}

/**
 * polling robusto adaptado para comportamento real da API
 */
export async function pollingStatus(request, hash, hash_checker, taskId, logCtx, options = {}) {
  void hash_checker;

  const maxTentativas = 6;
  const intervalo = 3000;

  let lastBody = null;
  let lastStatus = null;
  let lastStatusMessage = null;

  for (let i = 0; i < maxTentativas; i++) {
    let body;

    try {
      const response = await request.get(
        `${KYC_API}/api/v1/kyc/${TENANT_ID}/${hash}/task/${taskId}/status`,
        {
          headers: {
            'tenant-id': TENANT_ID,
            Authorization: basicAuthHeader(options?.clientAuth ?? null),
          },
        }
      );

      const rawText = await response.text();

      try {
        body = JSON.parse(rawText);
      } catch (parseError) {
        console.warn(`Tentativa ${i + 1}: JSON inválido, retry...`);
        await sleep(intervalo);
        continue;
      }

    } catch (error) {
      console.warn(`Tentativa ${i + 1}: erro na requisição, retry...`, error.message);
      await sleep(intervalo);
      continue;
    }

    // validação mínima
    if (!body || typeof body !== 'object') {
      console.warn(`Tentativa ${i + 1}: resposta inválida`);
      await sleep(intervalo);
      continue;
    }

    lastBody = body;

    console.log(`Tentativa ${i + 1}:`, body);

    // ===============================
    // EXTRAÇÃO
    // ===============================

    const session = body?.session_status;
    const sessionStatus = session?.status ?? null;

    // ===============================
    // STATUS FINAL
    // ===============================

    const isKnownSessionStatus =
      sessionStatus &&
      ['approved', 'rejected', 'analysis', 'error', 'pending'].includes(sessionStatus);

    // ===============================
    // REGRAS DE PARADA
    // ===============================

    const canStop = isKnownSessionStatus;

    if (canStop) {
      const statusMessage = extrairStatusMessageFromBody(body);
      const finalStatus = sessionStatus;
      lastStatus = finalStatus;
      lastStatusMessage = statusMessage;
      const stopReason = 'SESSION_STATUS';

      console.log(`Polling finalizado - motivo: ${stopReason}`);

      if (shouldWriteLog(logCtx)) {
        appendApiResultBlock({
          nomeCenario: logCtx.nomeCenario,
          cpf: logCtx.cpf ?? extrairCpfFromBody(body),
          retornoResponse: {
            ...body,
            stop_reason: stopReason,
          },
        });
      }

      if (logCtx?.returnDetails) {
        return { status: lastStatus, statusMessage, raw: body, stopReason };
      }

      return lastStatus;
    }

    await sleep(intervalo);
  }

  // ===============================
  // FALLBACK FINAL
  // ===============================

  if (lastBody) {
    console.warn('Polling finalizado por fallback');

    const lastSessionStatus = lastBody?.session_status?.status ?? null;
    const finalStatus = lastSessionStatus ?? lastStatus ?? null;

    if (shouldWriteLog(logCtx)) {
      appendApiResultBlock({
        nomeCenario: logCtx.nomeCenario,
        cpf: logCtx.cpf ?? extrairCpfFromBody(lastBody),
        retornoResponse: {
          ...lastBody,
          stop_reason: 'FALLBACK',
        },
      });
    }

    if (logCtx?.returnDetails) {
      return {
        status: finalStatus,
        statusMessage: lastStatusMessage,
        raw: lastBody,
        stopReason: 'FALLBACK',
      };
    }

    return finalStatus ?? lastStatus;
  }

  if (shouldWriteLog(logCtx)) {
    appendApiResultBlock({
      nomeCenario: logCtx.nomeCenario,
      cpf: logCtx.cpf ?? '',
      retornoResponse: {
        timeout_message: 'Timeout no polling',
        response: lastBody,
      },
    });
  }

  throw new Error('Timeout no polling');
}