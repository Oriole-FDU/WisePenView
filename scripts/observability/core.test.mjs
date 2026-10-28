/**
 * 可观测性核心行为测试。
 *
 * 覆盖隐私清洗、对象去重、上下文隔离、聚合摘要和发送预算。
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('../..', import.meta.url));

const aliasPlugin = {
  name: 'wise-pen-aliases',
  setup(buildContext) {
    buildContext.onResolve({ filter: /^@\// }, (args) => {
      const base = path.join(root, 'src', args.path.slice(2));
      const candidates = [
        `${base}.ts`,
        `${base}.tsx`,
        path.join(base, 'index.ts'),
        path.join(base, 'index.tsx'),
        base,
      ];
      const resolved = candidates.find((candidate) => existsSync(candidate));
      return resolved ? { path: resolved } : undefined;
    });
  },
};

const loadObservability = async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'wisepen-observability-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const entry = path.join(directory, 'entry.ts');
  const output = path.join(directory, 'entry.mjs');
  await writeFile(
    entry,
    `
      export { captureException, getSupportErrorId } from '@/observability';
      export { TelemetryAggregation } from '@/observability/aggregation';
      export { ObservabilityContext, createInitialContextAttributes, setActiveContext } from '@/observability/context';
      export { startPipeline } from '@/observability/pipeline';
      export { sanitizeDiagnosticText, sanitizeRequestUrl } from '@/observability/privacy';
      export { sanitizeSpanUrl } from '@/observability/otel';
      export { FRONTEND_NETWORK_ERROR } from '@/utils/error/codes';
      export { WisePenError } from '@/utils/error/WisePenError';
    `
  );
  await build({
    entryPoints: [entry],
    outfile: output,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    plugins: [aliasPlugin],
    define: {
      __APP_VERSION__: '"1.0.0"',
      'import.meta.env': JSON.stringify({
        MODE: 'test',
        VITE_API_BASE_URL: 'https://api.example.test',
        VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL: 'https://office.example.test',
      }),
      __APP_BUILD_INFO__: JSON.stringify({
        version: '1.0.0',
        commit: 'a'.repeat(40),
        buildId: 'build-test',
        mode: 'test',
        release: '1.0.0-aaaaaaaaaaaa-build-test',
        dirty: false,
      }),
    },
  });
  return import(`${pathToFileURL(output).href}?${Date.now()}`);
};

test('诊断文本和请求 URL 在进入遥测前移除凭据和本机路径', async (context) => {
  const telemetry = await loadObservability(context);
  const text = telemetry.sanitizeDiagnosticText(
    'https://api.example.test/path?token=secret Bearer secret me@example.test /Users/alice/app.ts file:///Users/alice/app.js'
  );
  assert.equal(text.includes('token='), false);
  assert.equal(text.includes('Bearer secret'), false);
  assert.equal(text.includes('me@example.test'), false);
  assert.equal(text.includes('/Users/alice'), false);
  assert.equal(
    telemetry.sanitizeRequestUrl('https://bucket.example.test/object?Signature=secret#hash'),
    'https://bucket.example.test/object'
  );

  const attributes = {
    'url.full': 'https://bucket.example.test/object?OSSAccessKeyId=secret',
  };
  telemetry.sanitizeSpanUrl({
    attributes,
    setAttribute(key, value) {
      attributes[key] = value;
    },
  });
  assert.equal(attributes['url.full'], 'https://bucket.example.test/object');
});

test('遥测关闭时 support ID 稳定且 capture 保持 no-op', async (context) => {
  const telemetry = await loadObservability(context);
  const error = new Error('disabled');
  const first = telemetry.captureException(error, { detector: 'window-error' });
  const second = telemetry.captureException(error, { detector: 'root-fallback' });
  assert.match(first, /^WPE-[A-Z0-9]{8}$/);
  assert.equal(first, second);
  assert.equal(telemetry.getSupportErrorId(error), first);
});

test('存储访问被拒绝时仍能建立匿名上下文', async (context) => {
  const telemetry = await loadObservability(context);
  const fakeWindow = {};
  Object.defineProperties(fakeWindow, {
    localStorage: {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    },
    sessionStorage: {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    },
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  context.after(() => delete globalThis.window);

  const attributes = telemetry.createInitialContextAttributes('test');
  assert.match(attributes['client.id'], /^[a-f0-9-]{36}$/i);
  assert.match(attributes['page.instance.id'], /^[a-f0-9-]{36}$/i);
});

test('异常进入统一聚合管线并过滤未提供的可选属性', async (context) => {
  const telemetry = await loadObservability(context);
  const logs = [];
  const attributes = telemetry.createInitialContextAttributes('test');
  const observabilityContext = new telemetry.ObservabilityContext(attributes, 0);
  observabilityContext.setRoute({
    'page.path': '/chat',
    'page.route': '/chat',
    'resource.id': undefined,
    'editor.type': undefined,
  });
  const fakeSpan = {
    end() {},
    recordException() {},
    setStatus() {},
  };
  telemetry.setActiveContext(observabilityContext);
  const stop = telemetry.startPipeline(
    observabilityContext,
    { startSpan: () => fakeSpan },
    { emit: (record) => logs.push(record) }
  );
  context.after(stop);

  const error = new Error('render failed');
  telemetry.captureException(error, {
    detector: 'application-handled',
    operation: 'chat.send',
  });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].attributes['error.operation'], undefined);
  assert.equal(logs[0].attributes['operation.name'], 'chat.send');
  assert.equal('resource.id' in logs[0].attributes, false);
  assert.equal('editor.type' in logs[0].attributes, false);
  assert.equal('react.component_stack' in logs[0].attributes, false);
  assert.equal('code.file.path' in logs[0].attributes, false);
  assert.equal('code.line.number' in logs[0].attributes, false);
  assert.equal('code.column.number' in logs[0].attributes, false);

  telemetry.captureException(error, {
    detector: 'window-error',
    operation: 'chat.send',
  });
  assert.equal(logs.length, 1);

  telemetry.captureException(
    new telemetry.WisePenError({
      code: telemetry.FRONTEND_NETWORK_ERROR.CANCELED,
      source: 'network',
    }),
    { detector: 'application-handled', operation: 'chat.stream' }
  );
  assert.equal(logs.length, 1);

  class ThrowingNameError extends Error {
    get name() {
      throw new Error('name getter failed');
    }
  }
  assert.doesNotThrow(() => {
    const id = telemetry.captureException(new ThrowingNameError(), {
      detector: 'window-error',
    });
    assert.match(id, /^WPE-[A-Z0-9]{8}$/);
  });
});

test('聚合摘要和预算使用同一套 occurrence 计数', async (context) => {
  const telemetry = await loadObservability(context);
  let now = 0;
  const events = [];
  const aggregation = new telemetry.TelemetryAggregation(
    (event) => events.push(event),
    () => now
  );
  const event = (fingerprint) => ({
    name: 'frontend.error',
    severity: 'ERROR',
    message: fingerprint,
    timestamp: now,
    attributes: {
      'error.fingerprint': fingerprint,
      'error.detector': 'window-error',
    },
  });

  for (let count = 0; count < 5; count++) aggregation.record(event('same'));
  assert.equal(events.length, 1);
  now = 60_000;
  aggregation.flush();
  assert.equal(events.at(-1).name, 'frontend.error_summary');
  assert.equal(events.at(-1).attributes['error.occurrence_count'], 4);
  assert.equal(events.at(-1).attributes['error.total_count'], 5);

  now = 0;
  const limited = [];
  const budget = new telemetry.TelemetryAggregation(
    (next) => limited.push(next),
    () => now
  );
  for (let count = 0; count < 250; count++) budget.record(event(`unique-${count}`));
  assert.equal(limited.length, 200);
  now = 60_000;
  budget.flush(true);
  assert.equal(limited.length, 201);
  assert.equal(limited.at(-1).name, 'telemetry.events_dropped');
  assert.equal(limited.at(-1).attributes['telemetry.dropped_count'], 50);
});
