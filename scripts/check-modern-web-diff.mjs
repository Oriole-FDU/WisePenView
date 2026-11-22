import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const zeroSha = '0000000000000000000000000000000000000000';
const [baseArg, headArg] = process.argv.slice(2);
const requestedBase = baseArg || process.env.BASE_SHA || '';
const requestedHead = headArg || process.env.HEAD_SHA || 'HEAD';
const head = requestedHead === zeroSha ? 'HEAD' : requestedHead;
const base =
  requestedBase && requestedBase !== zeroSha
    ? requestedBase
    : execFileSync('git', ['rev-parse', '--verify', `${head}^`], { encoding: 'utf8' }).trim();

const sourceExtensions = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.mjs',
  '.scss',
  '.ts',
  '.tsx',
]);

const changedFiles = execFileSync(
  'git',
  ['diff', '--name-only', '-z', '--diff-filter=ACMRTUXB', `${base}...${head}`, '--'],
  { encoding: 'buffer' }
)
  .toString()
  .split('\0')
  .filter((file) => sourceExtensions.has(path.extname(file).toLowerCase()));

if (changedFiles.length === 0) {
  console.log(JSON.stringify({ changedFiles: 0, totalFindings: 0 }));
  process.exit(0);
}

const scanRoot = mkdtempSync(path.join(os.tmpdir(), 'modern-web-diff-'));

try {
  for (const file of changedFiles) {
    const target = path.join(scanRoot, file);
    await mkdir(path.dirname(target), { recursive: true });
    const source = execFileSync('git', ['show', `${head}:${file}`]);
    await writeFile(target, source);
  }

  const output = execFileSync(
    'pnpm',
    [
      '--silent',
      'dlx',
      'modern-web-guidance@latest',
      'legacy-scan',
      scanRoot,
      '--json',
      '--skill-version',
      '2026_11_10-47b4c80e',
    ],
    { encoding: 'utf8' }
  );
  const jsonStart = output.indexOf('{');
  const jsonEnd = output.lastIndexOf('}');
  const result = JSON.parse(output.slice(jsonStart, jsonEnd + 1));

  console.log(JSON.stringify({ changedFiles: changedFiles.length, ...result }, null, 2));
  if (result.totalFindings > 0) {
    process.exitCode = 1;
  }
} finally {
  rmSync(scanRoot, { recursive: true, force: true });
}
