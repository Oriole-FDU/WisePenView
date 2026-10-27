import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

import { build } from 'vite';

import { installBrowser, loadTelemetry } from './harness.mjs';

test('同 commit 两次构建身份不同；bundle、公开文件、事件、详情与发布清单同源', async (context) => {
  installBrowser(context);
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'wisepen-build-')));
  context.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'index.html'), '<script type="module" src="/main.js"></script>');
  await writeFile(path.join(root, 'main.js'), 'console.log(__APP_BUILD_INFO__);');
  const identities = [];
  for (const index of [0, 1]) {
    const dist = path.join(root, `dist-${index}`);
    await build({
      configFile: path.resolve('vite.config.ts'),
      root,
      logLevel: 'silent',
      build: { outDir: dist, emptyOutDir: true, modulePreload: { polyfill: false } },
    });
    const identity = JSON.parse(await readFile(path.join(dist, 'build-info.json'), 'utf8'));
    identities.push(identity);
    assert.match(identity.commit, /^[a-f0-9]{40}$/);
    assert.equal(typeof identity.dirty, 'boolean');
    assert.equal(
      identity.commit,
      execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    );
    const assets = await readdir(path.join(dist, 'assets'));
    assert.ok(!assets.some((file) => file.endsWith('.map')));
    const bundle = await readFile(
      path.join(
        dist,
        'assets',
        assets.find((file) => file.endsWith('.js'))
      ),
      'utf8'
    );
    let bundled;
    vm.runInNewContext(bundle, {
      console: {
        log: (value) => {
          bundled = value;
        },
      },
    });
    assert.deepEqual(JSON.parse(JSON.stringify(bundled)), identity);

    const manifestFile = path.join(root, `manifest-${index}.json`);
    execFileSync(process.execPath, [
      'scripts/jenkins/create-release-manifest.mjs',
      '--dist',
      dist,
      '--out',
      manifestFile,
      '--build-mode',
      'production',
    ]);
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    assert.deepEqual(manifest.build, identity);
    assert.equal(manifest.release, identity.release);
    assert.ok(manifest.files.includes('build-info.json'));
    assert.throws(() =>
      execFileSync(
        process.execPath,
        [
          'scripts/jenkins/create-release-manifest.mjs',
          '--dist',
          dist,
          '--out',
          manifestFile,
          '--build-mode',
          'mock',
        ],
        { stdio: 'pipe' }
      )
    );

    const telemetry = await loadTelemetry('production', '/otel', { buildInfo: identity });
    const stop = telemetry.installOtelErrorReporter();
    context.after(stop);
    const error = new Error('runtime failure');
    const id = telemetry.reportError(error, { origin: 'react-uncaught' });
    const attributes = telemetry.records.at(-1).attributes;
    for (const [key, field] of Object.entries({
      'service.version': 'version',
      'service.commit': 'commit',
      'service.release': 'release',
      'service.build_id': 'buildId',
      'service.build_mode': 'mode',
      'service.dirty': 'dirty',
    }))
      assert.equal(attributes[key], identity[field]);
    for (const input of [
      error,
      'unknown',
      { status: 404, statusText: '', internal: true, data: '' },
    ]) {
      const detail = telemetry.buildErrorDetail(input, '/chat', id);
      for (const value of Object.values(identity)) assert.ok(detail.includes(String(value)));
      assert.ok(detail.includes(id));
    }
    stop();
  }
  assert.equal(identities[0].commit, identities[1].commit);
  assert.notEqual(identities[0].release, identities[1].release);
  for (const identity of identities) {
    const manifest = JSON.parse(
      await readFile(path.join(root, '.wisepen-debug', identity.release, 'manifest.json'), 'utf8')
    );
    assert.deepEqual(manifest.build, identity);
  }
});

test('真实 ErrorEvent 接线仅使用有效坐标备援，保留 stack，缺位置明确不可还原', async (context) => {
  const browser = installBrowser(context);
  const telemetry = await loadTelemetry();
  browser.cleanup(telemetry.installOtelErrorReporter());
  browser.cleanup(telemetry.installGlobalErrorReporting());
  const emit = (overrides) => {
    telemetry.flushTelemetryEvents(true);
    browser.listeners.get('window:error')({ message: 'runtime failure', ...overrides });
    return telemetry.records.at(-1).attributes;
  };
  const location = {
    filename: 'https://app.example.test/assets/main.js?token=secret',
    lineno: 2,
    colno: 3,
  };
  const coordinates = emit(location);
  assert.equal(coordinates['error.location_status'], 'event');
  assert.equal(coordinates['code.file.path'], 'https://app.example.test/assets/main.js');
  assert.equal(coordinates['code.line.number'], 2);
  assert.equal(coordinates['code.column.number'], 3);
  const error = new Error('with stack');
  error.stack = 'Error: with stack\n    at runtime (https://app.example.test/assets/real.js:4:5)';
  const stacked = emit({ ...location, error });
  assert.equal(stacked['error.location_status'], 'stack');
  assert.equal(stacked['error.stack'], error.stack);
  assert.equal(stacked['code.file.path'], undefined);
  for (const stack of [
    'Error: input assets/main.js:1:2',
    'Error: input\nuser text assets/main.js:1:2',
    'Error: input\n    at runtime (https://app.example.test/assets/main.js:9007199254740992:2)',
  ]) {
    const fallback = emit({ ...location, error: Object.assign(new Error('input'), { stack }) });
    assert.equal(fallback['error.location_status'], 'event');
    assert.equal(fallback['code.line.number'], 2);
    const unavailable = emit({ error: Object.assign(new Error('input'), { stack }) });
    assert.equal(unavailable['error.location_status'], 'unavailable');
  }
  for (const stack of [
    'Error: input\n    at https://app.example.test/assets/main.js:4:5',
    'runtime@https://app.example.test/assets/main.js:4:5',
  ]) {
    const valid = emit({ ...location, error: Object.assign(new Error('input'), { stack }) });
    assert.equal(valid['error.location_status'], 'stack');
  }
  for (const invalid of [
    {},
    { ...location, lineno: 0 },
    { ...location, colno: -1 },
    { ...location, colno: 1.5 },
    { ...location, filename: '' },
    { ...location, lineno: Infinity },
  ]) {
    const attributes = emit(invalid);
    assert.equal(attributes['error.location_status'], 'unavailable');
    assert.equal(attributes['code.file.path'], undefined);
    assert.equal(attributes['code.line.number'], undefined);
  }
});

test('错误码 16 经实际中英文解析器显示文案，未知错误仍使用通用提示', async (context) => {
  installBrowser(context);
  const telemetry = await loadTelemetry();
  for (const [language, expected] of [
    ['zh-CN', '服务器响应格式异常，请稍后重试'],
    ['en-US', 'The server returned an invalid response. Please try again later.'],
  ]) {
    await telemetry.i18n.changeLanguage(language);
    assert.equal(
      telemetry.parseErrorMessage(new telemetry.WisePenError({ source: 'network', code: 16 })),
      expected
    );
    assert.equal(
      telemetry.parseErrorMessage(undefined),
      telemetry.i18n.t('common.unknown', { ns: 'errors' })
    );
  }
  await telemetry.i18n.changeLanguage('zh-CN');
});

test('出口自行生成的 dropped 摘要也携带同一构建身份', async (context) => {
  const browser = installBrowser(context);
  context.mock.timers.enable({ apis: ['Date'], now: 1_000 });
  const telemetry = await loadTelemetry();
  browser.cleanup(telemetry.installOtelErrorReporter());
  for (let count = 0; count < 201; count++) {
    telemetry.recordTelemetryEvent('test.event', 'INFO', 'budget');
  }
  context.mock.timers.tick(60_000);
  telemetry.flushTelemetryEvents(true);
  const attributes = telemetry.records.at(-1).attributes;
  assert.equal(attributes['event.name'], 'telemetry.events_dropped');
  assert.equal(attributes['service.release'], telemetry.buildInfo.release);
  assert.equal(attributes['service.commit'], telemetry.buildInfo.commit);
});
