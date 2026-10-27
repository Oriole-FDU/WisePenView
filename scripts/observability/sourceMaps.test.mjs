import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { build } from 'vite';

import { collectPublicFiles } from '../jenkins/public-artifacts.mjs';

process.env.VITE_API_BASE_URL = 'https://api.example.test';
process.env.VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL = 'https://office.example.test';

test('hidden source map 移出公开目录，并按 release 与哈希精确还原', async (context) => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'wisepen-maps-check-')));
  context.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'index.html'), '<script type="module" src="/main.js"></script>');
  await writeFile(
    path.join(root, 'main.js'),
    'function fail() {\n  throw new Error("fixture sentinel");\n}\nglobalThis.fixture = fail;\n'
  );

  const dist = path.join(root, 'dist');
  await build({
    configFile: path.resolve('vite.config.ts'),
    root,
    mode: 'development',
    logLevel: 'silent',
    build: { outDir: dist, modulePreload: { polyfill: false } },
  });

  const identity = JSON.parse(await readFile(path.join(dist, 'build-info.json'), 'utf8'));
  const artifacts = path.join(root, '.wisepen-debug', identity.release);
  const manifest = JSON.parse(await readFile(path.join(artifacts, 'manifest.json'), 'utf8'));
  const asset = manifest.assets[0];
  assert.ok(asset);
  const bundle = await readFile(path.join(artifacts, asset.file), 'utf8');
  assert.ok(!bundle.includes('sourceMappingURL='));
  assert.equal(bundle, await readFile(path.join(dist, asset.file), 'utf8'));
  assert.ok(!(await readdir(dist, { recursive: true })).some((file) => /\.map$/i.test(file)));

  const column = bundle.indexOf('throw') + 1;
  const frame = `${asset.file}:1:${column}`;
  const run = (directory = artifacts, release = identity.release, position = frame) =>
    spawnSync(
      process.execPath,
      [
        'scripts/symbolicate-error.mjs',
        '--artifacts',
        directory,
        '--release',
        release,
        '--frame',
        position,
      ],
      { encoding: 'utf8' }
    );

  const restored = run();
  assert.equal(restored.status, 0, restored.stderr);
  const original = JSON.parse(restored.stdout);
  assert.equal(original.release, identity.release);
  assert.equal(original.commit, identity.commit);
  assert.match(original.fileName, /(?:^|\/)main\.js$/);
  assert.equal(original.lineNumber, 2);
  assert.equal(original.columnNumber, 3);

  const rejected = run(artifacts, 'wrong-release');
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /无法还原/);
  assert.equal(rejected.stdout, '');

  const broken = path.join(root, 'broken-artifacts');
  await cp(artifacts, broken, { recursive: true });
  await writeFile(path.join(broken, asset.map), '{}');
  assert.notEqual(run(broken).status, 0);

  const traversal = path.join(root, 'traversal-artifacts');
  await cp(artifacts, traversal, { recursive: true });
  const traversalManifest = structuredClone(manifest);
  traversalManifest.assets[0].map = '../outside.map';
  await writeFile(path.join(traversal, 'manifest.json'), JSON.stringify(traversalManifest));
  assert.notEqual(run(traversal).status, 0);

  assert.ok(!(await collectPublicFiles(dist)).some((file) => /\.map$/i.test(file)));
  await writeFile(path.join(dist, 'leaked.map'), '{}');
  await assert.rejects(collectPublicFiles(dist), /source map/);
  const manifestFile = path.join(root, 'release.json');
  const manifestResult = spawnSync(
    process.execPath,
    [
      'scripts/jenkins/create-release-manifest.mjs',
      '--dist',
      dist,
      '--out',
      manifestFile,
      '--build-mode',
      'development',
    ],
    { encoding: 'utf8' }
  );
  assert.notEqual(manifestResult.status, 0);
  assert.match(manifestResult.stderr, /source map/);
});
