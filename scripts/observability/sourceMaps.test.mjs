/**
 * 私有源码映射与构建身份回归测试。
 *
 * 使用真实 Vite 构建验证公开目录防泄漏、release 绑定和离线还原。
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { build } from 'vite';

import { collectPublicFiles } from '../jenkins/public-artifacts.mjs';

const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'wisepen-maps-check-')));

test('hidden source map 移出 dist 并按 release 精确还原', async (context) => {
  context.after(() => rm(root, { recursive: true, force: true }));
  process.env.VITE_API_BASE_URL = 'https://api.example.test';
  process.env.VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL = 'https://office.example.test';
  await writeFile(path.join(root, 'index.html'), '<script type="module" src="/main.js"></script>');
  await writeFile(
    path.join(root, 'main.js'),
    'function fail() {\n  throw new Error("fixture");\n}\nglobalThis.fixture = fail;\n'
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
  assert.equal(manifest.build.release, identity.release);
  assert.ok(manifest.assets.length > 0);
  assert.equal(
    (await readdir(dist, { recursive: true })).some((file) => /\.map$/i.test(file)),
    false
  );
  const publicFiles = await collectPublicFiles(dist);
  assert(publicFiles.includes('build-info.json'));
  assert.equal(
    publicFiles.some((file) => /\.map$/i.test(file)),
    false
  );

  const asset = manifest.assets[0];
  const bundle = await readFile(path.join(artifacts, asset.file), 'utf8');
  const column = bundle.split('\n')[0].indexOf('function') + 1;
  const frame = `${asset.file}:1:${column}`;
  const symbolicate = (release = identity.release) =>
    spawnSync(
      process.execPath,
      [
        'scripts/symbolicate-error.mjs',
        '--artifacts',
        artifacts,
        '--release',
        release,
        '--frame',
        frame,
      ],
      { encoding: 'utf8' }
    );

  const restored = symbolicate();
  assert.equal(restored.status, 0, restored.stderr);
  const original = JSON.parse(restored.stdout);
  assert.equal(original.release, identity.release);
  assert.equal(original.commit, identity.commit);
  assert.match(original.fileName, /main\.js$/);
  assert.notEqual(symbolicate('wrong-release').status, 0);

  const releaseManifest = path.join(root, 'release.json');
  const manifestResult = spawnSync(
    process.execPath,
    [
      'scripts/jenkins/create-release-manifest.mjs',
      '--dist',
      dist,
      '--out',
      releaseManifest,
      '--build-mode',
      'development',
    ],
    { encoding: 'utf8' }
  );
  assert.equal(manifestResult.status, 0, manifestResult.stderr);
  const release = JSON.parse(await readFile(releaseManifest, 'utf8'));
  assert.equal(release.release, identity.release);
  assert.deepEqual(release.build, identity);

  const secondDist = path.join(root, 'dist-second');
  await build({
    configFile: path.resolve('vite.config.ts'),
    root,
    mode: 'development',
    logLevel: 'silent',
    build: { outDir: secondDist, modulePreload: { polyfill: false } },
  });
  const secondIdentity = JSON.parse(
    await readFile(path.join(secondDist, 'build-info.json'), 'utf8')
  );
  assert.equal(secondIdentity.commit, identity.commit);
  assert.notEqual(secondIdentity.buildId, identity.buildId);
  assert.notEqual(secondIdentity.release, identity.release);
});
