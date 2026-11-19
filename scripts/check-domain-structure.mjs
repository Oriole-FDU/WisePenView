import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const domainRoot = join(root, 'src/domains');
const PASCAL_CASE_NAME = /^[A-Z][A-Za-z0-9]*$/;
const CAMEL_CASE_NAME = /^[a-z][A-Za-z0-9]*$/;
const allowedDirectories = new Set([
  'apis',
  'constants',
  'entity',
  'enum',
  'mapper',
  'mock',
  'model',
  'runtime',
  'service',
  'session',
  'utils',
  'validation',
]);

const normalizePath = (path) => relative(root, path).split('\\').join('/');

const walkDirectories = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const path = join(directory, entry.name);
    return [path, ...walkDirectories(path)];
  });

const errors = [];
const domains = readdirSync(domainRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name)
  .sort();

for (const domain of domains) {
  const domainDirectory = join(domainRoot, domain);
  const relativeDomainDirectory = normalizePath(domainDirectory);

  if (!PASCAL_CASE_NAME.test(domain)) {
    errors.push(`${relativeDomainDirectory} 必须使用 PascalCase`);
  }
  if (!existsSync(join(domainDirectory, 'index.ts'))) {
    errors.push(`${relativeDomainDirectory} 缺少 index.ts`);
  }
  if (!existsSync(join(domainDirectory, 'BUSINESS.md'))) {
    errors.push(`${relativeDomainDirectory} 缺少 BUSINESS.md`);
  }
  for (const entry of readdirSync(domainDirectory, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      !entry.name.startsWith('.') &&
      entry.name !== 'index.ts' &&
      entry.name !== 'BUSINESS.md'
    ) {
      errors.push(`${relativeDomainDirectory}/${entry.name} 不能直接位于 domain 根目录`);
    }
  }
  if (
    !existsSync(join(domainDirectory, 'service/index.type.ts')) ||
    !existsSync(join(domainDirectory, `service/${domain}Services.impl.ts`))
  ) {
    errors.push(
      `${relativeDomainDirectory}/service 必须包含 index.type.ts 与 ${domain}Services.impl.ts`
    );
  }

  const directories = walkDirectories(domainDirectory);
  for (const directory of directories) {
    const relativeDirectory = relative(domainDirectory, directory);
    const segments = relativeDirectory.split(/[\\/]/);
    if (segments.length === 1 && !allowedDirectories.has(segments[0])) {
      errors.push(`${normalizePath(directory)} 不是允许的 domain 子目录`);
    }
    for (const segment of segments) {
      if (!CAMEL_CASE_NAME.test(segment)) {
        errors.push(`${normalizePath(directory)} 的分组目录 ${segment} 必须使用 camelCase`);
      }
    }

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.tsx')) {
        errors.push(`${normalizePath(join(directory, entry.name))} 不应位于 domain 层`);
      }
    }
  }

  const apisDirectory = join(domainDirectory, 'apis');
  if (!existsSync(apisDirectory)) continue;
  const apiFiles = readdirSync(apisDirectory).filter((filename) => filename.endsWith('.ts'));
  const contractStems = new Set(
    apiFiles
      .filter((filename) => filename.endsWith('Api.contract.ts'))
      .map((filename) => filename.slice(0, -'.contract.ts'.length))
  );
  const schemaStems = new Set(
    apiFiles
      .filter((filename) => filename.endsWith('Api.schema.ts'))
      .map((filename) => filename.slice(0, -'.schema.ts'.length))
  );

  for (const stem of contractStems) {
    if (!schemaStems.has(stem)) {
      errors.push(`${relativeDomainDirectory}/apis/${stem}.contract.ts 缺少配套 ${stem}.schema.ts`);
    }
  }
  for (const stem of schemaStems) {
    if (!contractStems.has(stem)) {
      errors.push(`${relativeDomainDirectory}/apis/${stem}.schema.ts 缺少配套 ${stem}.contract.ts`);
    }
  }
}

if (errors.length > 0) {
  console.error('Domain 结构检查失败：');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Domain 结构检查通过：${domains.length} 个 domain，目录、入口、业务文档、service 与 API 配对符合约定。`
);
