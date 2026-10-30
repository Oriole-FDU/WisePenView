import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const baselinePath = join(root, 'scripts/api-contract-baseline.json');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

const normalizePath = (path) => relative(root, path).split('\\').join('/');

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const sourceFiles = walk(join(root, 'src/domains')).filter((path) =>
  ['.ts', '.tsx'].includes(extname(path))
);
const apiFiles = sourceFiles.filter(
  (path) =>
    path.includes('/apis/') &&
    path.endsWith('Api.ts') &&
    !path.endsWith('Api.type.ts') &&
    !path.endsWith('Api.contract.ts')
);
const contractFiles = sourceFiles.filter((path) => path.endsWith('Api.contract.ts'));
const uncheckedMethodNames = new Set([
  'apiPostUnchecked',
  'apiGetUnchecked',
  'apiPutUnchecked',
  'apiDeleteUnchecked',
]);
const checkedTransportNames = new Set(['apiPost', 'apiGet', 'apiPut', 'apiPatch', 'apiDelete']);
const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const allowedPlacements = new Set(['body', 'query', 'none']);

const errors = [];
const endpointOwners = new Map();

const parseSourceFile = (path) =>
  ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);

const getStringLiteral = (node) => {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
};

const getStaticEndpoint = (node) =>
  getStringLiteral(node) ?? (ts.isTemplateExpression(node) ? node.getText() : undefined);

const getProperty = (objectLiteral, propertyName) =>
  objectLiteral.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      property.name.getText().replace(/^['"]|['"]$/g, '') === propertyName
  );

const registerEndpoint = (method, endpoint, owner) => {
  if (!method || !endpoint) return;
  const key = `${method} ${endpoint.replace(/\s+/g, '')}`;
  const existingOwner = endpointOwners.get(key);
  if (existingOwner) {
    errors.push(`${owner} 与 ${existingOwner} 重复定义 endpoint：${key}`);
    return;
  }
  endpointOwners.set(key, owner);
};

let checkedContracts = 0;
const contractNames = new Set();
for (const path of contractFiles) {
  const relativePath = normalizePath(path);
  const sourceFile = parseSourceFile(path);

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text.endsWith('Contract') &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === 'defineApiContract'
    ) {
      checkedContracts += 1;
      contractNames.add(node.name.text);
      const contract = node.initializer.arguments[0];
      if (!contract || !ts.isObjectLiteralExpression(contract)) {
        errors.push(`${relativePath}:${node.name.text} 必须直接使用对象字面量`);
        return;
      }

      const requiredProperties = [
        'name',
        'method',
        'endpoint',
        'requestPlacement',
        'transport',
        'request',
        'response',
      ];
      for (const propertyName of requiredProperties) {
        if (!getProperty(contract, propertyName)) {
          errors.push(`${relativePath}:${node.name.text} 缺少 ${propertyName}`);
        }
      }

      const method = getStringLiteral(getProperty(contract, 'method')?.initializer);
      const endpoint = getStringLiteral(getProperty(contract, 'endpoint')?.initializer);
      const placement = getStringLiteral(getProperty(contract, 'requestPlacement')?.initializer);
      const transport = getStringLiteral(getProperty(contract, 'transport')?.initializer);

      if (!method || !allowedMethods.has(method)) {
        errors.push(`${relativePath}:${node.name.text} 的 method 非法`);
      }
      if (!placement || !allowedPlacements.has(placement)) {
        errors.push(`${relativePath}:${node.name.text} 的 requestPlacement 非法`);
      }
      if (transport !== 'json' && transport !== 'text') {
        errors.push(`${relativePath}:${node.name.text} 必须使用 JSON 或 text Contract`);
      }
      if ((method === 'GET' || method === 'DELETE') && placement === 'body') {
        errors.push(`${relativePath}:${node.name.text} 的 ${method} 请求不能使用 body`);
      }
      if (!endpoint?.startsWith('/')) {
        errors.push(`${relativePath}:${node.name.text} 的 endpoint 必须以 / 开头`);
      }
      registerEndpoint(method, endpoint, `${relativePath}:${node.name.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

const uncheckedCalls = {};
const specialTransportCalls = {};
const usedContractNames = new Set();
for (const path of apiFiles) {
  const relativePath = normalizePath(path);
  const sourceFile = parseSourceFile(path);
  let uncheckedCount = 0;
  let textCount = 0;
  let directCheckedCount = 0;
  let checkedContractCallCount = 0;

  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const callName = node.expression.text;
      if (uncheckedMethodNames.has(callName)) {
        uncheckedCount += 1;
        const method = callName.replace('api', '').replace('Unchecked', '').toUpperCase();
        registerEndpoint(
          method,
          getStaticEndpoint(node.arguments[0]),
          `${relativePath}:${callName}`
        );
      }
      if (callName === 'apiGetText') {
        textCount += 1;
        registerEndpoint(
          'GET-TEXT',
          getStaticEndpoint(node.arguments[0]),
          `${relativePath}:apiGetText`
        );
      }
      if (checkedTransportNames.has(callName)) {
        directCheckedCount += 1;
        const method = callName.replace('api', '').toUpperCase();
        registerEndpoint(
          method,
          getStaticEndpoint(node.arguments[0]),
          `${relativePath}:${callName}`
        );
      }
      if (callName === 'executeApiContract') {
        checkedContractCallCount += 1;
        const contractName = node.arguments[0];
        if (ts.isIdentifier(contractName)) {
          usedContractNames.add(contractName.text);
        } else {
          errors.push(`${relativePath}:executeApiContract 必须直接传入 Contract 标识符`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (directCheckedCount > 0) {
    errors.push(
      `${relativePath} 直接调用 ${directCheckedCount} 个 checked transport；必须改用 executeApiContract`
    );
  }
  if (!Object.hasOwn(baseline.uncheckedCalls, relativePath) && checkedContractCallCount === 0) {
    errors.push(`${relativePath} 未使用 executeApiContract，不能新增无契约 API 文件`);
  }
  if (uncheckedCount > 0) uncheckedCalls[relativePath] = uncheckedCount;
  if (textCount > 0) specialTransportCalls[relativePath] = { apiGetText: textCount };
}

for (const contractName of usedContractNames) {
  if (!contractNames.has(contractName)) {
    errors.push(`API 使用了未声明的 Contract：${contractName}`);
  }
}
for (const contractName of contractNames) {
  if (!usedContractNames.has(contractName)) {
    errors.push(`Contract 未被 API 调用：${contractName}`);
  }
}

const directFetchCounts = {};
for (const path of sourceFiles) {
  const relativePath = normalizePath(path);
  const sourceFile = parseSourceFile(path);
  let fetchCount = 0;
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'fetch'
    ) {
      fetchCount += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (fetchCount > 0) directFetchCounts[relativePath] = fetchCount;
}

const compareExactCounts = (label, actual, expected) => {
  const files = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  for (const file of files) {
    const actualCount = actual[file] ?? 0;
    const expectedCount = expected[file] ?? 0;
    if (actualCount !== expectedCount) {
      errors.push(
        `${label}：${file} 当前 ${actualCount}，基线 ${expectedCount}；迁移完成后请同步下调基线`
      );
    }
  }
};

const flattenSpecialTransports = (counts) =>
  Object.fromEntries(
    Object.entries(counts).flatMap(([file, methods]) =>
      Object.entries(methods).map(([method, count]) => [`${file}#${method}`, count])
    )
  );

compareExactCounts('未契约化调用', uncheckedCalls, baseline.uncheckedCalls);
compareExactCounts(
  '特殊 transport',
  flattenSpecialTransports(specialTransportCalls),
  flattenSpecialTransports(baseline.specialTransports)
);
compareExactCounts('直接 fetch', directFetchCounts, baseline.directFetches);

if (checkedContracts !== baseline.checkedContracts) {
  errors.push(
    `checked Contract 当前 ${checkedContracts}，基线 ${baseline.checkedContracts}；变更后请同步更新基线`
  );
}

if (errors.length > 0) {
  console.error('API Contract 边界检查失败：');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const uncheckedTotal = Object.values(uncheckedCalls).reduce((sum, count) => sum + count, 0);
  const specialTransportTotal = Object.values(specialTransportCalls).reduce(
    (sum, methods) => sum + Object.values(methods).reduce((fileSum, count) => fileSum + count, 0),
    0
  );
  console.log(
    `API Contract 边界检查通过：${checkedContracts} 个 Contract，${uncheckedTotal + specialTransportTotal} 个待迁移 REST 调用（${uncheckedTotal} unchecked，${specialTransportTotal} special），0 个重复 endpoint。`
  );
}
