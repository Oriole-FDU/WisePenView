import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { context, propagation, ROOT_CONTEXT } from '@opentelemetry/api';
import { build } from 'esbuild';

const resolveSdk = createRequire(import.meta.resolve('@opentelemetry/browser-sdk'));
const { TracerProvider } = await import(
  pathToFileURL(resolveSdk.resolve('@opentelemetry/sdk-trace')).href
);
const { LoggerProvider } = await import(
  pathToFileURL(resolveSdk.resolve('@opentelemetry/sdk-logs')).href
);
const { W3CTraceContextPropagator } = await import(
  pathToFileURL(resolveSdk.resolve('@opentelemetry/core')).href
);
const activeContext = new AsyncLocalStorage();
context.setGlobalContextManager({
  active: () => activeContext.getStore() ?? ROOT_CONTEXT,
  with(value, fn, thisArg, ...args) {
    return activeContext.run(value, () => fn.apply(thisArg, args));
  },
  bind(value, target) {
    if (typeof target !== 'function') return target;
    return function (...args) {
      return activeContext.run(value, () => target.apply(this, args));
    };
  },
  enable() {
    return this;
  },
  disable() {
    activeContext.disable();
    return this;
  },
});
propagation.setGlobalPropagator(new W3CTraceContextPropagator());

/** 使用真实 SDK，仅把 span 和 log processor 替换为内存出口，不发送网络请求。 */
export function createTestOtel(processor) {
  const records = [];
  const spans = [];
  const traceProvider = new TracerProvider({
    spanProcessors: [
      processor,
      {
        onStart(span) {
          spans.push(span);
        },
        onEnd() {},
        forceFlush: async () => {},
        shutdown: async () => {},
      },
    ],
  });
  const logProvider = new LoggerProvider({
    processors: [
      {
        onEmit(record) {
          records.push(record);
        },
        forceFlush: async () => {},
        shutdown: async () => {},
      },
    ],
  });
  return {
    records,
    spans,
    tracer: traceProvider.getTracer('telemetry-test'),
    logger: logProvider.getLogger('telemetry-test'),
  };
}

const otelSource = `
  import { createTestOtel } from ${JSON.stringify(import.meta.url)};
  import { TelemetrySpanProcessor } from '@/telemetry/_internal/spanProcessor';
  export const { records, spans, tracer, logger } = createTestOtel(new TelemetrySpanProcessor());
  export const isTelemetryEnabled = true;
`;

export const testBuildInfo = {
  version: 'test-version',
  commit: 'a'.repeat(40),
  buildId: 'test-build',
  mode: 'development',
  release: `test-version-${'a'.repeat(12)}-test-build`,
  dirty: false,
};

export async function loadTelemetry(mode = 'development', endpoint = '/otel', options = {}) {
  const configSource = `export const publicAppConfig = ${JSON.stringify({
    mode,
    observability: { otelEndpoint: endpoint },
    api: { baseUrl: 'https://api.example.test' },
  })};`;
  const result = await build({
    stdin: {
      resolveDir: process.cwd(),
      contents: `
      export { TelemetryContext } from '@/telemetry/_internal/context';
      export { TelemetrySpanProcessor } from '@/telemetry/_internal/spanProcessor';
      export { ErrorAggregation } from '@/telemetry/_internal/errorAggregation';
      export * from '@/telemetry/_internal/runtime';
      export { sanitizeDiagnosticText, readRequestPath } from '@/telemetry/_internal/sanitize';
      export { installOtelErrorReporter } from '@/telemetry/_internal/errorReporter';
      export { reportError } from '@/utils/error/reportError';
      export { installGlobalErrorReporting } from '@/utils/error/reportError';
      export { buildInfo } from '@/config/buildInfo';
      export { buildErrorDetail } from '@/components/business/ErrorPage/errorDetail';
      export { default as i18n } from '@/i18n';
      export { parseErrorMessage, WisePenError } from '@/utils/error';
      export { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';
      export { installAppTelemetry, getTelemetryPage, loadTelemetryUser } from '@/telemetry/_internal/lifecycle';
      export { default as httpClient } from '@/apis/_internal/httpClient';
      export { apiGet, apiGetText, apiPost, apiPut, apiDelete } from '@/apis/request';
      export { records, spans, tracer } from '@/telemetry/_internal/otel';
      export { installTelemetry } from '@/telemetry';
    `,
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    tsconfig: 'tsconfig.app.json',
    write: false,
    define: {
      __APP_VERSION__: '"test-version"',
      __APP_BUILD_INFO__: JSON.stringify(options.buildInfo ?? testBuildInfo),
      'import.meta.env.DEV': JSON.stringify(mode === 'development'),
    },
    plugins: [
      {
        name: 'telemetry-test-boundaries',
        setup(builder) {
          builder.onResolve(
            {
              filter: /runtimeConfig$|(?:^|\/)otel$|apiServerAddr$/,
            },
            (args) => {
              if (args.path.endsWith('runtimeConfig')) return { path: 'config', namespace: 'test' };
              if (args.path.endsWith('apiServerAddr'))
                return { path: 'address', namespace: 'test' };
              return { path: 'otel', namespace: 'test' };
            }
          );
          builder.onLoad({ filter: /.*/, namespace: 'test' }, ({ path }) => ({
            resolveDir: process.cwd(),
            contents:
              path === 'config'
                ? configSource
                : path === 'otel'
                  ? otelSource.replace(
                      'isTelemetryEnabled = true',
                      `isTelemetryEnabled = ${Boolean(endpoint) && mode !== 'mock'}`
                    )
                  : `export const awaitAddrReady = async () => {};
           export const getApiBaseUrl = () => 'https://api.example.test';
           export const notifyAddrFailure = () => {};`,
          }));
        },
      },
    ],
  });
  // 临时模块沿用项目依赖解析，同时让失败堆栈保留可读文件名。
  const cache = join(process.cwd(), 'node_modules/.cache');
  await mkdir(cache, { recursive: true });
  const directory = await mkdtemp(join(cache, 'telemetry-'));
  const entry = join(directory, 'fixture.mjs');
  try {
    await writeFile(entry, result.outputFiles[0].text);
    return await import(pathToFileURL(entry).href);
  } finally {
    await rm(directory, { recursive: true });
  }
}

function memoryStorage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
  };
}

export function installBrowser(context) {
  const cleanups = [];
  context.after(() => {
    for (const cleanup of cleanups.reverse()) cleanup();
  });
  const listeners = new Map();
  const timers = new Set();
  const surface = (name) => ({
    addEventListener(type, listener) {
      listeners.set(`${name}:${type}`, listener);
    },
    removeEventListener(type) {
      listeners.delete(`${name}:${type}`);
    },
  });
  const document = { ...surface('document'), visibilityState: 'visible', documentElement: {} };
  const window = {
    ...surface('window'),
    location: { pathname: '/', origin: 'https://app.example.test' },
    setTimeout,
    clearTimeout,
    setInterval(fn) {
      timers.add(fn);
      return fn;
    },
    clearInterval(fn) {
      timers.delete(fn);
    },
  };
  const navigator = { onLine: true, userAgent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36' };
  navigator.languages = ['zh-CN'];
  window.navigator = navigator;
  window.localStorage = memoryStorage();
  for (const [key, value] of Object.entries({
    window,
    document,
    navigator,
    localStorage: window.localStorage,
    sessionStorage: memoryStorage(),
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    context.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else delete globalThis[key];
    });
  }
  return { listeners, timers, document, navigator, cleanup: (fn) => cleanups.push(fn) };
}
