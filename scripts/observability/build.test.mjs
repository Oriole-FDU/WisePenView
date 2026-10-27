import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

import { build } from 'vite';

const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'wisepen-build-check-')));

test.after(() => rm(root, { recursive: true, force: true }));

test('同 commit 的不同构建共享 bundle、公开文件与发布清单身份', async () => {
  await writeFile(path.join(root, 'index.html'), '<script type="module" src="/main.js"></script>');
  await writeFile(path.join(root, 'main.js'), 'console.log(__APP_BUILD_INFO__);');

  const identities = [];
  for (let index = 0; index < 2; index++) {
    const dist = path.join(root, `dist-${index}`);
    await build({
      configFile: path.resolve('vite.config.ts'),
      root,
      mode: 'development',
      logLevel: 'silent',
      build: {
        outDir: dist,
        emptyOutDir: true,
        modulePreload: { polyfill: false },
      },
    });

    const identity = JSON.parse(await readFile(path.join(dist, 'build-info.json'), 'utf8'));
    identities.push(identity);
    assert.match(identity.commit, /^[a-f0-9]{40}$/);
    assert.equal(
      identity.commit,
      execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    );
    assert.equal(identity.version, JSON.parse(await readFile('package.json', 'utf8')).version);
    assert.equal(typeof identity.dirty, 'boolean');

    const assets = await readdir(path.join(dist, 'assets'));
    const bundle = await readFile(
      path.join(
        dist,
        'assets',
        assets.find((file) => file.endsWith('.js'))
      ),
      'utf8'
    );
    let bundledIdentity;
    vm.runInNewContext(bundle, {
      console: {
        log(value) {
          bundledIdentity = value;
        },
      },
    });
    assert.deepEqual(JSON.parse(JSON.stringify(bundledIdentity)), identity);

    const manifestFile = path.join(root, `manifest-${index}.json`);
    execFileSync(process.execPath, [
      'scripts/jenkins/create-release-manifest.mjs',
      '--dist',
      dist,
      '--out',
      manifestFile,
      '--build-mode',
      'development',
    ]);
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    assert.equal(manifest.release, identity.release);
    assert.deepEqual(manifest.build, identity);
    assert(manifest.files.includes('build-info.json'));
  }

  assert.equal(identities[0].commit, identities[1].commit);
  assert.notEqual(identities[0].release, identities[1].release);
  assert.notEqual(identities[0].buildId, identities[1].buildId);
});
