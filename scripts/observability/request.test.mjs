/**
 * 逻辑请求观测与最终失败分类回归。
 *
 * 通过实际 request API、Axios 拦截器和真实 OTel context 验证重试、解析、
 * 分类、取消与账号切换归属；外部传输使用受控 adapter。
 */
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ROOT_CONTEXT } from '@opentelemetry/api';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../..', import.meta.url));
const contextStorage = new AsyncLocalStorage();
const contextManager = {
  active: () => contextStorage.getStore() ?? ROOT_CONTEXT,
  bind: (context, target) =>
    function bound(...args) {
      return contextStorage.run(context, () => target.apply(this, args));
    },
  disable() {
    contextStorage.disable();
  },
  enable() {},
  with: (context, target, thisArg, ...args) =>
    contextStorage.run(context, () => target.apply(thisArg, args)),
};

const stubs = {
  '@/apis/_internal/apiServerAddr': `
    export const awaitAddrReady = async () => {};
    export const getApiBaseUrl = () => 'https://api.example.test';
    export const notifyAddrFailure = () => {};
  `,
  '@/apis/_internal/developmentTraffic': `
    export const applyXDeveloperHeader = headers => headers;
  `,
};

const aliasPlugin = {
  name: 'wise-pen-request-test-aliases',
  setup(buildContext) {
    buildContext.onResolve({ filter: /^@\// }, (args) => {
      if (stubs[args.path]) return { path: args.path, namespace: 'stub' };
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
    buildContext.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
      contents: stubs[args.path],
      loader: 'js',
    }));
  },
};

const loadRequestModules = async (context) => {
  const directory = await mkdtemp(path.join(root, 'node_modules', '.request-observability-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const entry = path.join(directory, 'entry.ts');
  const output = path.join(directory, 'entry.mjs');
  await writeFile(
    entry,
    `
      export { apiGet, apiGetText, apiPost } from '@/apis/request';
      export { default as httpClient } from '@/apis/_internal/httpClient';
      export { AxiosError } from 'axios';
      export { context as otelContext, trace } from '@opentelemetry/api';
      export { ObservabilityContext, createInitialContextAttributes, setActiveContext } from '@/observability/context';
      export { startPipeline } from '@/observability/pipeline';
      export { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';
    `
  );
  await build({
    entryPoints: [entry],
    outfile: output,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    nodePaths: [path.join(root, 'node_modules')],
    external: ['axios', '@opentelemetry/api'],
    plugins: [aliasPlugin],
    define: {
      'import.meta.env': JSON.stringify({ MODE: 'test' }),
      __APP_BUILD_INFO__: JSON.stringify({
        version: '1.0.0',
        commit: 'a'.repeat(40),
        buildId: 'request-test',
        mode: 'test',
        release: '1.0.0-aaaaaaaaaaaa-request-test',
        dirty: false,
      }),
    },
  });
  return import(`${pathToFileURL(output).href}?${Date.now()}`);
};

const createHarness = (telemetry, context) => {
  telemetry.otelContext.setGlobalContextManager(contextManager);
  const logs = [];
  const spans = [];
  let nextSpanId = 1;
  const tracer = {
    startSpan(name, options = {}) {
      const span = {
        attributes: { ...(options.attributes ?? {}) },
        ended: false,
        name,
        status: undefined,
        addEvent() {},
        end() {
          this.ended = true;
        },
        isRecording() {
          return true;
        },
        recordException() {},
        setAttribute(key, value) {
          this.attributes[key] = value;
        },
        setAttributes(attributes) {
          Object.assign(this.attributes, attributes);
        },
        setStatus(status) {
          this.status = status;
        },
        spanContext() {
          return {
            traceId: '11111111111111111111111111111111',
            spanId: String(nextSpanId++).padStart(16, '0'),
            traceFlags: 1,
          };
        },
      };
      spans.push(span);
      return span;
    },
  };
  const observabilityContext = new telemetry.ObservabilityContext(
    telemetry.createInitialContextAttributes('test'),
    telemetry.authSessionCoordinator.getSessionVersion()
  );
  telemetry.setActiveContext(observabilityContext);
  const stop = telemetry.startPipeline(observabilityContext, tracer, {
    emit: (record) => logs.push(record),
  });
  context.after(stop);
  return { logs, observabilityContext, spans };
};

const response = (config, data, status = 200, headers = {}) => ({
  config,
  data,
  status,
  statusText: '',
  headers,
});

test('成功请求只有一个逻辑 span，传输层位于其上下文，不生成成功日志', async (context) => {
  const telemetry = await loadRequestModules(context);
  const { logs, observabilityContext, spans } = createHarness(telemetry, context);
  observabilityContext.setRoute({ 'page.route': '/chat', 'page.path': '/chat' });
  observabilityContext.identify('user-a', telemetry.authSessionCoordinator.getSessionVersion());
  let activeRequestSpan;
  const adapter = async (config) => {
    activeRequestSpan = telemetry.trace.getSpan(telemetry.otelContext.active());
    return response(config, { code: 200, msg: 'ok', data: 42 }, 200, {
      'x-request-id': 'request-success',
    });
  };

  assert.equal(await telemetry.apiGet('/success?token=secret', { adapter }), 42);
  assert.equal(logs.length, 0);
  assert.equal(activeRequestSpan, spans[0]);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].ended, true);
  assert.equal(spans[0].attributes['api.endpoint'], '/success');
  assert.equal(spans[0].attributes['api.outcome'], 'success');
  assert.equal(spans[0].attributes['wisepen.request_id'], 'request-success');
  const breadcrumb = observabilityContext
    .capture()
    .breadcrumbs.find((item) => item.name === 'http.request');
  assert.equal(breadcrumb?.attributes['api.endpoint'], '/success');
});

test('逻辑请求覆盖全部重试，只生成一个最终 HTTP 失败事件', async (context) => {
  const telemetry = await loadRequestModules(context);
  const { logs, spans } = createHarness(telemetry, context);
  let attempts = 0;
  const adapter = async (config) => {
    attempts += 1;
    throw new telemetry.AxiosError(
      'server failure',
      'ERR_BAD_RESPONSE',
      config,
      {},
      response(config, { code: 50001, msg: 'private server text' }, 503)
    );
  };

  await assert.rejects(telemetry.apiGet('/retry?token=secret', { adapter, retryDelayMs: 0 }));
  assert.equal(attempts, 3);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].attributes['event.name'], 'frontend.request_failure');
  assert.equal(logs[0].attributes['error.kind'], 'http');
  assert.equal(logs[0].attributes['http.response.status_code'], 503);
  assert.equal(logs[0].attributes['http.request.resend_count'], 2);
  assert.equal(logs[0].attributes['api.endpoint'], '/retry');
  assert.equal(logs[0].attributes['api.server_message'], 'private server text');
  assert.equal(spans.length, 1);
  assert.equal(spans[0].ended, true);
});

test('最终失败按 HTTP、网络、超时、业务、契约和取消分类', async (context) => {
  const telemetry = await loadRequestModules(context);
  const { logs } = createHarness(telemetry, context);
  const cases = [
    {
      name: 'http',
      adapter(config) {
        throw new telemetry.AxiosError(
          'not found',
          'ERR_BAD_REQUEST',
          config,
          {},
          response(config, {}, 404)
        );
      },
      kind: 'http',
      severity: 'WARN',
    },
    {
      name: 'network',
      adapter(config) {
        throw new telemetry.AxiosError('offline', 'ERR_NETWORK', config);
      },
      kind: 'network',
      severity: 'ERROR',
    },
    {
      name: 'timeout',
      adapter(config) {
        throw new telemetry.AxiosError('timeout', 'ECONNABORTED', config);
      },
      kind: 'timeout',
      severity: 'ERROR',
    },
    {
      name: 'business',
      adapter: async (config) =>
        response(config, { code: 49901, msg: 'business failure', data: null }),
      kind: 'business',
      severity: 'WARN',
    },
    {
      name: 'contract',
      adapter: async (config) => response(config, { unexpected: true }),
      kind: 'contract',
      severity: 'ERROR',
    },
  ];

  for (const item of cases) {
    const before = logs.length;
    await assert.rejects(
      telemetry.apiGet(`/${item.name}`, {
        adapter: item.adapter,
        retry: false,
      })
    );
    assert.equal(logs.length, before + 1);
    assert.equal(logs.at(-1).attributes['error.kind'], item.kind);
    assert.equal(logs.at(-1).severityText, item.severity);
  }

  const beforeCancel = logs.length;
  await assert.rejects(
    telemetry.apiGet('/cancel', {
      adapter(config) {
        throw new telemetry.AxiosError('canceled', 'ERR_CANCELED', config);
      },
      retry: false,
    })
  );
  assert.equal(logs.length, beforeCancel);
});

test('迟到请求失败保留发起时的用户与会话，不污染新账号 breadcrumb', async (context) => {
  const telemetry = await loadRequestModules(context);
  const { logs, observabilityContext } = createHarness(telemetry, context);
  observabilityContext.identify('user-a', telemetry.authSessionCoordinator.getSessionVersion());
  const oldSession = observabilityContext.capture().attributes['session.id'];
  const started = Promise.withResolvers();
  const finish = Promise.withResolvers();
  const adapter = async (config) => {
    started.resolve();
    await finish.promise;
    throw new telemetry.AxiosError(
      'server failure',
      'ERR_BAD_RESPONSE',
      config,
      {},
      response(config, {}, 503)
    );
  };
  const pending = telemetry.apiGet('/old-request', { adapter, retry: false });
  await started.promise;

  telemetry.authSessionCoordinator.publish('login');
  const nextVersion = telemetry.authSessionCoordinator.getSessionVersion();
  observabilityContext.resetIdentity(nextVersion);
  observabilityContext.identify('user-b', nextVersion);
  finish.resolve();
  await assert.rejects(pending);

  assert.equal(logs.at(-1).attributes['user.id'], 'user-a');
  assert.equal(logs.at(-1).attributes['session.id'], oldSession);
  assert.equal(
    observabilityContext
      .capture()
      .breadcrumbs.some((item) => item.attributes['api.endpoint'] === '/old-request'),
    false
  );
});
