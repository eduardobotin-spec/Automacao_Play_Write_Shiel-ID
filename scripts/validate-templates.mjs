import fs from 'fs';
import path from 'path';

import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const ROOT = process.cwd();

const FILES_TO_VALIDATE = [
  path.join(ROOT, 'tests', 'onboarding-biometria.spec.js'),
  path.join(ROOT, 'tests', 'onboarding-equilibrio.spec.js'),
];

function isIdent(node, name) {
  return node?.type === 'Identifier' && node.name === name;
}

function objectExprPropertyKeys(objNode) {
  if (objNode?.type !== 'ObjectExpression') return null;
  const keys = [];
  for (const p of objNode.properties ?? []) {
    if (p.type !== 'Property') continue;
    const k = p.key;
    if (k.type === 'Identifier') keys.push(k.name);
    else if (k.type === 'Literal' && typeof k.value === 'string') keys.push(k.value);
  }
  return keys;
}

function isLiteral(node) {
  return node?.type === 'Literal';
}

function isAwaitCall(stmt, calleeName) {
  if (stmt?.type !== 'VariableDeclaration') return false;
  if (stmt.declarations?.length !== 1) return false;
  const init = stmt.declarations[0]?.init;
  if (!init || init.type !== 'AwaitExpression') return false;
  const call = init.argument;
  if (!call || call.type !== 'CallExpression') return false;
  return isIdent(call.callee, calleeName);
}

function assertCA001LikeBody(body, where) {
  const stmts = body?.body ?? [];
  if (stmts.length !== 4) {
    throw new Error(`${where}: CA precisa ter exatamente 4 statements (gerarHash, biometria, polling, expect).`);
  }

  // 1) const { hash, hash_checker } = await gerarHash(request, <cpf>);
  const s1 = stmts[0];
  if (!isAwaitCall(s1, 'gerarHash')) throw new Error(`${where}: step 1 deve ser "await gerarHash(...)".`);
  const d1 = s1.declarations[0];
  if (d1.id?.type !== 'ObjectPattern') throw new Error(`${where}: step 1 deve desestruturar "{ hash, hash_checker }".`);
  const props = d1.id.properties?.map((p) => p.key?.name).filter(Boolean) ?? [];
  if (!props.includes('hash') || !props.includes('hash_checker')) {
    throw new Error(`${where}: step 1 deve desestruturar "{ hash, hash_checker }".`);
  }
  const c1args = d1.init.argument.arguments ?? [];
  if (
    (c1args.length !== 2 && c1args.length !== 3) ||
    !isIdent(c1args[0], 'request') ||
    !isLiteral(c1args[1])
  ) {
    throw new Error(`${where}: step 1 deve ser "gerarHash(request, <string>)" ou "gerarHash(request, <string>, <objeto>)".`);
  }

  // 2) const bioResponse = await processarBiometria(request, hash, hash_checker, <payload>);
  const s2 = stmts[1];
  if (!isAwaitCall(s2, 'processarBiometria')) throw new Error(`${where}: step 2 deve ser "await processarBiometria(...)".`);
  const d2 = s2.declarations[0];
  if (!isIdent(d2.id, 'bioResponse')) throw new Error(`${where}: step 2 deve declarar "const bioResponse = ...".`);
  const c2args = d2.init.argument.arguments ?? [];
  if (
    c2args.length !== 4 ||
    !isIdent(c2args[0], 'request') ||
    !isIdent(c2args[1], 'hash') ||
    !isIdent(c2args[2], 'hash_checker') ||
    !isLiteral(c2args[3])
  ) {
    throw new Error(`${where}: step 2 deve ser "processarBiometria(request, hash, hash_checker, <string>)".`);
  }

  // 3) const status = await pollingStatus(request, hash, hash_checker, bioResponse.taskId, { cpf, nomeCenario });
  const s3 = stmts[2];
  if (!isAwaitCall(s3, 'pollingStatus')) throw new Error(`${where}: step 3 deve ser "await pollingStatus(...)".`);
  const d3 = s3.declarations[0];
  if (!isIdent(d3.id, 'status')) throw new Error(`${where}: step 3 deve declarar "const status = ...".`);
  const c3args = d3.init.argument.arguments ?? [];
  const a4 = c3args[3];
  if (
    c3args.length !== 5 ||
    !isIdent(c3args[0], 'request') ||
    !isIdent(c3args[1], 'hash') ||
    !isIdent(c3args[2], 'hash_checker') ||
    a4?.type !== 'MemberExpression' ||
    !isIdent(a4.object, 'bioResponse') ||
    (!isIdent(a4.property, 'taskId') && a4.property?.value !== 'taskId')
  ) {
    throw new Error(`${where}: step 3 deve ser "pollingStatus(request, hash, hash_checker, bioResponse.taskId, { cpf, nomeCenario })".`);
  }
  const logKeys = objectExprPropertyKeys(c3args[4]);
  if (!logKeys || !logKeys.includes('cpf') || !logKeys.includes('nomeCenario')) {
    throw new Error(`${where}: step 3 5º argumento deve ser objeto com "cpf" e "nomeCenario".`);
  }

  // 4) expect(status).toBe(<statusEsperado>) OU expect([..]).toContain(status);
  const s4 = stmts[3];
  if (s4?.type !== 'ExpressionStatement') throw new Error(`${where}: step 4 deve ser um expect(...).toBe(...).`);
  const call4 = s4.expression;
  if (call4?.type !== 'CallExpression') throw new Error(`${where}: step 4 deve ser uma chamada ".toBe(...)" ou ".toContain(...)".`);
  if (call4.callee?.type !== 'MemberExpression') throw new Error(`${where}: step 4 deve ser "expect(...).toBe(...)" ou "expect(...).toContain(...)".`);
  const { object, property } = call4.callee;
  if (object?.type !== 'CallExpression' || !isIdent(object.callee, 'expect')) {
    throw new Error(`${where}: step 4 deve começar com "expect(...)".`);
  }
  const expectArgs = object.arguments ?? [];
  const methodArgs = call4.arguments ?? [];
  const method = isIdent(property, 'toBe') || property?.value === 'toBe'
    ? 'toBe'
    : isIdent(property, 'toContain') || property?.value === 'toContain'
      ? 'toContain'
      : '';
  if (!method) throw new Error(`${where}: step 4 deve usar ".toBe(...)" ou ".toContain(...)".`);

  if (method === 'toBe') {
    if (expectArgs.length !== 1 || !isIdent(expectArgs[0], 'status') || methodArgs.length !== 1 || !isLiteral(methodArgs[0])) {
      throw new Error(`${where}: step 4 com toBe deve ser "expect(status).toBe(<literal>)".`);
    }
    return;
  }

  const arg0 = expectArgs[0];
  if (
    expectArgs.length !== 1 ||
    arg0?.type !== 'ArrayExpression' ||
    (arg0.elements ?? []).length === 0 ||
    (arg0.elements ?? []).some((el) => !isLiteral(el)) ||
    methodArgs.length !== 1 ||
    !isIdent(methodArgs[0], 'status')
  ) {
    throw new Error(`${where}: step 4 com toContain deve ser "expect([<literais>]).toContain(status)".`);
  }
}

function assertEQ001LikeBody(body, where) {
  const stmts = body?.body ?? [];
  if (stmts.length < 3) {
    throw new Error(`${where}: EQ precisa ter pelo menos 3 statements (gerarHash, documento, expect).`);
  }

  // 1) const { hash } = await gerarHash(request, <cpf>);
  const s1 = stmts[0];
  if (!isAwaitCall(s1, 'gerarHash')) throw new Error(`${where}: step 1 deve ser "await gerarHash(...)".`);
  const d1 = s1.declarations[0];
  if (d1.id?.type !== 'ObjectPattern') throw new Error(`${where}: step 1 deve desestruturar "{ hash }".`);
  const props = d1.id.properties?.map((p) => p.key?.name).filter(Boolean) ?? [];
  if (!props.includes('hash')) {
    throw new Error(`${where}: step 1 deve desestruturar "{ hash }" (hash_checker e cpf opcionais).`);
  }
  const c1args = d1.init.argument.arguments ?? [];
  if (
    (c1args.length !== 2 && c1args.length !== 3) ||
    !isIdent(c1args[0], 'request') ||
    !isLiteral(c1args[1])
  ) {
    throw new Error(`${where}: step 1 deve ser "gerarHash(request, <string>)" ou "gerarHash(request, <string>, <objeto>)".`);
  }

  // 2) const docResponse = await processarDocumento(request, hash, <payload>);
  const s2 = stmts[1];
  if (!isAwaitCall(s2, 'processarDocumento')) throw new Error(`${where}: step 2 deve ser "await processarDocumento(...)".`);
  const d2 = s2.declarations[0];
  if (!isIdent(d2.id, 'docResponse')) throw new Error(`${where}: step 2 deve declarar "const docResponse = ...".`);
  const c2args = d2.init.argument.arguments ?? [];
  if (c2args.length !== 3 || !isIdent(c2args[0], 'request') || !isIdent(c2args[1], 'hash') || !isLiteral(c2args[2])) {
    throw new Error(`${where}: step 2 deve ser "processarDocumento(request, hash, <string>)".`);
  }

  // 3) expect(docResponse.status()).toBe(200);
  const s3 = stmts[2];
  if (s3?.type !== 'ExpressionStatement') throw new Error(`${where}: step 3 deve ser um expect(...).toBe(...).`);
  const call3 = s3.expression;
  if (call3?.type !== 'CallExpression') throw new Error(`${where}: step 3 deve ser uma chamada ".toBe(...)".`);
  if (call3.callee?.type !== 'MemberExpression') throw new Error(`${where}: step 3 deve ser "expect(...).toBe(...)".`);
  const { object, property } = call3.callee;
  if (!(isIdent(property, 'toBe') || property?.value === 'toBe')) throw new Error(`${where}: step 3 deve usar ".toBe(...)".`);
  if (object?.type !== 'CallExpression' || !isIdent(object.callee, 'expect')) {
    throw new Error(`${where}: step 3 deve ser "expect(docResponse.status()).toBe(...)".`);
  }
  const expectArgs = object.arguments ?? [];
  const toBeArgs = call3.arguments ?? [];
  const arg0 = expectArgs[0];
  if (
    expectArgs.length !== 1 ||
    arg0?.type !== 'CallExpression' ||
    arg0.callee?.type !== 'MemberExpression' ||
    !isIdent(arg0.callee.object, 'docResponse') ||
    (!isIdent(arg0.callee.property, 'status') && arg0.callee.property?.value !== 'status') ||
    (arg0.arguments?.length ?? 0) !== 0 ||
    toBeArgs.length !== 1 ||
    !isLiteral(toBeArgs[0])
  ) {
    throw new Error(`${where}: step 3 deve ser "expect(docResponse.status()).toBe(<literal>)".`);
  }
}

function validateFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const ast = acorn.parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowHashBang: true,
  });

  const errors = [];

  walk.simple(ast, {
    CallExpression(node) {
      if (!isIdent(node.callee, 'test')) return;
      const title = node.arguments?.[0];
      const fn = node.arguments?.[1];
      if (!isLiteral(title) || typeof title.value !== 'string') return;
      if (!fn || (fn.type !== 'FunctionExpression' && fn.type !== 'ArrowFunctionExpression')) return;

      const t = title.value;
      const where = `${path.relative(ROOT, filePath)} :: test("${t}")`;

      if (/^CA\d+/.test(t)) {
        try {
          assertCA001LikeBody(fn.body, where);
        } catch (e) {
          errors.push(e?.message ?? String(e));
        }
      }

      if (/^EQ\d+/.test(t)) {
        try {
          assertEQ001LikeBody(fn.body, where);
        } catch (e) {
          errors.push(e?.message ?? String(e));
        }
      }
    },
  });

  return errors;
}

const allErrors = [];
for (const file of FILES_TO_VALIDATE) {
  if (!fs.existsSync(file)) continue;
  allErrors.push(...validateFile(file));
}

if (allErrors.length) {
  console.error('\nVALIDAÇÃO DE TEMPLATES FALHOU — cenários fora do template CA001/EQ001:\n');
  for (const e of allErrors) console.error(`- ${e}`);
  console.error('\nRegra: só é permitido alterar dados (CPF/imagens/payload/status esperado). Estrutura/ordem/métodos devem ser idênticos.\n');
  process.exit(1);
}

console.log('Validação de templates OK (CA001/EQ001).');
