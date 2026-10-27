import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { build } from 'vite';

import { collectPublicFiles } from '../jenkins/public-artifacts.mjs';

test('真实压缩产物及私有附件按 release 精确还原，异常输入全部明确失败', async (context) => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'wisepen-maps-')));
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
    logLevel: 'silent',
    build: { outDir: dist, modulePreload: { polyfill: false } },
  });
  const identity = JSON.parse(await readFile(path.join(dist, 'build-info.json'), 'utf8'));
  const artifacts = path.join(root, '.wisepen-debug', identity.release);
  const manifest = JSON.parse(await readFile(path.join(artifacts, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.build, identity);
  const asset = manifest.assets[0];
  const bundle = await readFile(path.join(artifacts, asset.file), 'utf8');
  assert.ok(!bundle.includes('sourceMappingURL='));
  assert.equal(bundle, await readFile(path.join(dist, asset.file), 'utf8'));
  const column = bundle.indexOf('throw') + 1;
  assert.ok(column > 0);
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
  assert.match(original.fileName, /(?:^|\/)main\.js$/);
  assert.equal(original.lineNumber, 2);
  assert.equal(original.columnNumber, 3);
  const fails = (result) => {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /无法还原/);
    assert.equal(result.stdout, '');
  };
  fails(run(artifacts, 'wrong-release'));
  for (const position of [
    'assets/missing.js:1:1',
    `${asset.file}:0:1`,
    `${asset.file}:1:0`,
    `${asset.file}:1:-1`,
    `${asset.file}:1:1.5`,
    `${asset.file}:999:1`,
    `${asset.file}:1:9999999`,
    `${asset.file}:1:9007199254740993`,
    `../${asset.file}:1:1`,
  ])
    fails(run(artifacts, identity.release, position));
  const mutate = async (name, change) => {
    const destination = path.join(root, name);
    await cp(artifacts, destination, { recursive: true });
    await change(destination);
    fails(run(destination));
  };
  await mutate('missing', (dir) => rm(path.join(dir, asset.map)));
  await mutate('broken-js', (dir) => writeFile(path.join(dir, asset.file), 'broken'));
  await mutate('broken-map', (dir) => writeFile(path.join(dir, asset.map), '{}'));
  await mutate('unmapped', async (dir) => {
    const content = Buffer.from(
      JSON.stringify({ version: 3, sources: [], names: [], mappings: '' })
    );
    await writeFile(path.join(dir, asset.map), content);
    const next = structuredClone(manifest);
    next.assets[0].mapSha256 = createHash('sha256').update(content).digest('hex');
    await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(next));
  });
  await mutate('traversal', async (dir) => {
    const next = structuredClone(manifest);
    next.assets[0].map = '../outside.map';
    await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(next));
  });
  const outside = path.join(root, 'outside.map');
  await cp(path.join(artifacts, asset.map), outside);
  await mutate('symlink', async (dir) => {
    await rm(path.join(dir, asset.map));
    await symlink(outside, path.join(dir, asset.map));
  });
  assert.ok(!(await collectPublicFiles(dist)).some((file) => /\.map$/i.test(file)));
  await writeFile(path.join(dist, 'leaked.map'), '{}');
  await assert.rejects(collectPublicFiles(dist), /source map/);
  const releaseManifest = path.join(root, 'release.json');
  const rejected = spawnSync(
    process.execPath,
    [
      'scripts/jenkins/create-release-manifest.mjs',
      '--dist',
      dist,
      '--out',
      releaseManifest,
      '--build-mode',
      'production',
    ],
    { encoding: 'utf8' }
  );
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /source map/);
  await rm(path.join(dist, 'leaked.map'));
  await writeFile(
    path.join(dist, 'unsafe.js'),
    '//# sourceMappingURL=data:application/json;base64,e30='
  );
  await assert.rejects(collectPublicFiles(dist), /source map/);
  await rm(path.join(dist, 'unsafe.js'));
  await mkdir(path.join(dist, '.wisepen-debug'));
  await assert.rejects(collectPublicFiles(dist), /source map/);
  await rm(path.join(dist, '.wisepen-debug'), { recursive: true });
  await symlink(outside, path.join(dist, 'linked.js'));
  await assert.rejects(collectPublicFiles(dist), /符号链接/);
});

test('OSS 入口在访问远端之前拒绝清单中或实际目录中的公开 map', async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wisepen-oss-guard-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'dist'));
  await writeFile(path.join(root, 'dist/index.html'), 'fixture');
  const manifest = path.join(root, 'manifest.json');
  const deploy = () =>
    spawnSync(process.execPath, [path.resolve('scripts/jenkins/deploy-oss-release.mjs')], {
      cwd: root,
      encoding: 'utf8',
      timeout: 5000,
      env: {
        ...process.env,
        OSS_ENDPOINT: 'oss-cn-shanghai.aliyuncs.com',
        OSS_BUCKET: 'test-bucket',
        OSS_CLEAN_POLICY: 'keep-previous-release',
        RELEASE_MANIFEST: manifest,
        ALIYUN_ACCESS_KEY_ID: 'test-id',
        ALIYUN_ACCESS_KEY_SECRET: 'test-only',
      },
    });
  await writeFile(manifest, JSON.stringify({ files: ['index.html', 'leaked.map'] }));
  let result = deploy();
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source map/);
  await writeFile(manifest, JSON.stringify({ files: ['index.html'] }));
  await writeFile(path.join(root, 'dist/leaked.map'), '{}');
  result = deploy();
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source map/);
});
