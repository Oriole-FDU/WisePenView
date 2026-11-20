import path from 'node:path';

const PASCAL_CASE_NAME = /^[A-Z][A-Za-z0-9]*$/;
const CAMEL_CASE_NAME = /^[a-z][A-Za-z0-9]*$/;
const DOMAIN_ROOT = /^src\/domains\/([^/]+)\/(.*)$/;
const DOMAIN_IMPORT = /^@\/domains\/([^/]+)\/(.+)$/;

const allowedDomainDirectories = new Set([
  'apis',
  'constants',
  'entity',
  'enum',
  'mapper',
  'mock',
  'model',
  'runtime',
  'runtimeV2',
  'service',
  'session',
  'utils',
  'validation',
]);

const isCamelCaseModuleName = (filename) =>
  /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)*\.ts$/.test(filename);

const isCanonicalApiFile = (filename) =>
  /^[A-Z][A-Za-z0-9]*Api(?:\.contract|\.schema)?\.ts$/.test(filename);

const isCanonicalServiceFile = (domain, filename) =>
  filename === 'index.type.ts' ||
  filename === `${domain}Services.impl.ts` ||
  isCamelCaseModuleName(filename);

const isCanonicalMapperFile = (filename) =>
  /^[A-Z][A-Za-z0-9]*Services\.map\.ts$/.test(filename) ||
  /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)*\.mapper\.ts$/.test(filename);

const isCanonicalMockFile = (filename) =>
  /^[A-Z][A-Za-z0-9]*Api\.mock\.ts$/.test(filename) || isCamelCaseModuleName(filename);

const normalizeRelativePath = (cwd, filename) =>
  path.relative(cwd, filename).split(path.sep).join('/');

const getCurrentDomain = (relativePath) => {
  const match = relativePath.match(DOMAIN_ROOT);
  if (!match || match[1].startsWith('_')) return null;
  return match[1];
};

export const domainConventionRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '约束 domain 目录、逻辑文件命名和领域公共导入边界',
    },
    schema: [],
    messages: {
      domainName: 'Domain 根目录必须使用 PascalCase；当前目录为 {{domain}}。',
      domainRootFile: 'Domain 根目录只允许 index.ts；当前文件为 {{file}}。',
      domainDirectory: 'Domain 内不允许该顶层目录：{{directory}}。',
      domainSubdirectory: 'Domain 内的分组目录必须使用 camelCase；当前目录为 {{directory}}。',
      domainTsx: 'Domain 层只承载 TypeScript 逻辑，不允许包含 TSX：{{file}}。',
      domainFile: '{{directory}} 目录中的文件命名不符合约定：{{file}}。',
      deepImport:
        'Domain 外不能直接导入 {{target}} 的内部文件；请从 @/domains/{{target}} 根出口导入，或在装配入口声明明确例外。',
    },
  },
  create(context) {
    const relativePath = normalizeRelativePath(context.cwd, context.filename);
    const currentDomain = getCurrentDomain(relativePath);
    const domainMatch = relativePath.match(DOMAIN_ROOT);

    const reports = [];
    if (currentDomain && domainMatch) {
      const [, domain, domainRelativePath] = domainMatch;
      const segments = domainRelativePath.split('/');
      const filename = segments.at(-1) ?? '';
      const directory = segments[0];
      const nestedDirectories = segments.slice(0, -1);

      if (!PASCAL_CASE_NAME.test(domain)) {
        reports.push(['domainName', { domain }]);
      }
      if (segments.length === 1 && filename !== 'index.ts') {
        reports.push(['domainRootFile', { file: filename }]);
      }
      if (segments.length > 1 && !allowedDomainDirectories.has(directory)) {
        reports.push(['domainDirectory', { directory }]);
      }
      for (const nestedDirectory of nestedDirectories.slice(1)) {
        if (!CAMEL_CASE_NAME.test(nestedDirectory)) {
          reports.push(['domainSubdirectory', { directory: nestedDirectory }]);
        }
      }
      if (filename.endsWith('.tsx')) {
        reports.push(['domainTsx', { file: filename }]);
      } else if (segments.length > 1) {
        const isValidFile =
          directory === 'apis'
            ? isCanonicalApiFile(filename)
            : directory === 'service'
              ? isCanonicalServiceFile(domain, filename)
              : directory === 'mapper'
                ? isCanonicalMapperFile(filename)
                : directory === 'mock'
                  ? isCanonicalMockFile(filename)
                  : filename === 'index.ts' || isCamelCaseModuleName(filename);

        if (!isValidFile) {
          reports.push(['domainFile', { directory, file: filename }]);
        }
      }
    }

    return {
      ImportDeclaration(node) {
        if (relativePath.startsWith('src/domains/_registry/')) return;
        const importPath = node.source.value;
        if (typeof importPath !== 'string') return;
        const match = importPath.match(DOMAIN_IMPORT);
        if (!match) return;
        const targetDomain = match[1];
        if (targetDomain.startsWith('_') || targetDomain === currentDomain) return;
        context.report({
          node: node.source,
          messageId: 'deepImport',
          data: { target: targetDomain },
        });
      },
      'Program:exit'(program) {
        for (const [messageId, data] of reports) {
          context.report({ node: program, messageId, data });
        }
      },
    };
  },
};
