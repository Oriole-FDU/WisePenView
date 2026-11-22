import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const zeroSha = '0000000000000000000000000000000000000000';
const head = process.env.HEAD_SHA || 'HEAD';
const requestedBase = process.env.BASE_SHA || '';
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
} else {
  const scanRoot = await mkdtemp(path.join(os.tmpdir(), 'modern-web-diff-'));

  try {
    for (const file of changedFiles) {
      const target = path.join(scanRoot, file);
      await mkdir(path.dirname(target), { recursive: true });
      const source = execFileSync('git', ['show', `${head}:${file}`]);
      await writeFile(target, source);
    }

    console.log(
      `Scanning ${changedFiles.length} changed source files with the latest Modern Web Guidance rules`
    );
    const output = execFileSync(
      'pnpm',
      ['--silent', 'dlx', 'modern-web-guidance@latest', 'legacy-scan', scanRoot, '--json'],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    const result = JSON.parse(output);

    if (!Number.isInteger(result.totalFindings)) {
      throw new Error('Modern Web Guidance returned JSON without a valid totalFindings count.');
    }

    console.log(JSON.stringify({ ...result, changedFiles: changedFiles.length }, null, 2));
    if (result.totalFindings > 0) {
      console.error(
        `::error::Modern Web Guidance found ${result.totalFindings} finding(s) in changed source files.`
      );
      process.exitCode = 1;
    }
  } finally {
    await rm(scanRoot, { recursive: true, force: true });
  }
}
