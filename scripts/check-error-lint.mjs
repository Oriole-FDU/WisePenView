#!/usr/bin/env node
/**
 * 只输出前端错误契约相关 ESLint 命中（见 agent/docs/error.md / lint/error.js）。
 * 用法：pnpm lint:error
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ERROR_RULES = new Set([
  'wisepen/no-arbitrary-throw',
  'wisepen/no-direct-error-toast',
  'wisepen/no-direct-wise-pen-error',
  'wisepen/no-legacy-error-api',
  'wisepen/no-direct-capture-exception',
  'wisepen/no-report-error-outside-boundary',
]);

const RESTRICTED_SYNTAX_NEEDLES = [
  '禁止直接创建原生 Error',
  'Domain 内禁止直接 new WisePenError',
  '禁止直接 new WisePenError',
];

const result = spawnSync('pnpm', ['exec', 'eslint', 'src/**/*.{ts,tsx}', '-f', 'json'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

let reports;
try {
  reports = JSON.parse(result.stdout || '[]');
} catch {
  console.error('无法解析 ESLint JSON 输出');
  if (result.stderr) console.error(result.stderr);
  process.exit(1);
}

const hits = [];
for (const file of reports) {
  const rel = path.relative(root, file.filePath).replaceAll('\\', '/');
  for (const message of file.messages ?? []) {
    const rule = message.ruleId ?? '';
    const text = message.message ?? '';
    const matchRestricted =
      rule === 'no-restricted-syntax' &&
      RESTRICTED_SYNTAX_NEEDLES.some((needle) => text.includes(needle));
    if (!ERROR_RULES.has(rule) && !matchRestricted) continue;
    hits.push({
      rel,
      line: message.line,
      column: message.column,
      rule,
      text,
    });
  }
}

hits.sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line || a.column - b.column);

const counts = new Map();
for (const hit of hits) {
  counts.set(hit.rule, (counts.get(hit.rule) ?? 0) + 1);
}

console.log(`error lint: ${hits.length} hit(s)\n`);
console.log('by rule:');
for (const [rule, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${rule}`);
}
console.log('');
for (const hit of hits) {
  console.log(`${hit.rel}:${hit.line}:${hit.column}  ${hit.rule}  ${hit.text}`);
}

process.exit(hits.length > 0 ? 1 : 0);
