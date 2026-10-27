import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { context, ROOT_CONTEXT } from '@opentelemetry/api';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cacheRoot = path.join(root, 'node_modules/.cache');
const activeContext = new AsyncLocalStorage();
const fakeBuildInfo = {
  version: 'test-version',
  commit: 'a'.repeat(40),
  buildId: 'test-build',
  mode: 'development',
  release: `test-version-${'a'.repeat(12)}-test-build`,
  dirty: false,
};

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

const resolveFromBrowserSdk = createRequire(import.meta.resolve('@opentelemetry/browser-sdk'));
const { TracerProvider } = await import(
  pathToFileURL(resolveFromBrowserSdk.resolve('@opentelemetry/sdk-trace')).href
);
const { LoggerProvider } = await import(
  pathToFileURL(resolveFromBrowserSdk.resolve('@opentelemetry/sdk-logs')).href
);

const createTestOtel = () => {
  const records = [];
  const spans = [];
  const traceProvider = new TracerProvider({
    spanProcessors: [
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
  const loggerProvider = new LoggerProvider({
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
    tracer: traceProvider.getTracer('observability-test'),
    logger: loggerProvider.getLogger('observability-test'),
  };
};

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

export const installBrowser = (testContext) => {
  const listeners = new Map();
  const timers = new Map();
  let timerId = 0;
  const target = (surface) => ({
    addEventListener(type, listener) {
      const key = `${surface}:${type}`;
      const entries = listeners.get(key) ?? new Set();
      entries.add(listener);
      listeners.set(key, entries);
    },
    removeEventListener(type, listener) {
      listeners.get(`${surface}:${type}`)?.delete(listener);
    },
  });
  const document = {
    ...target('document'),
    documentElement: {},
    visibilityState: 'visible',
  };
  const localStorage = memoryStorage();
  const sessionStorage = memoryStorage();
  const navigator = {
    languages: ['zh-CN'],
    onLine: true,
    userAgent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36',
  };
  const window = {
    ...target('window'),
    location: { pathname: '/chat', origin: 'https://app.example.test' },
    localStorage,
    navigator,
    sessionStorage,
    setInterval(listener) {
      timerId += 1;
      timers.set(timerId, listener);
      return timerId;
    },
    clearInterval(id) {
      timers.delete(id);
    },
  };

  for (const [key, value] of Object.entries({
    window,
    document,
    navigator,
    localStorage,
    sessionStorage,
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    testContext.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else delete globalThis[key];
    });
  }

  return {
    document,
    listeners,
    localStorage,
    navigator,
    sessionStorage,
    timers,
    window,
    dispatch(surface, type, event = {}) {
      for (const listener of listeners.get(`${surface}:${type}`) ?? []) listener(event);
    },
    listenerCount() {
      return [...listeners.values()].reduce((count, entries) => count + entries.size, 0);
    },
  };
};

export const loadObservability = async (
  testContext,
  { enabled = true, mode = 'development', entry = '', stubs = {} } = {}
) => {
  await mkdir(cacheRoot, { recursive: true });
  const directory = await mkdtemp(path.join(cacheRoot, 'observability-check-'));
  const moduleFile = path.join(directory, 'observability.mjs');
  const oTelSource = `
    import { createTestOtel } from ${JSON.stringify(import.meta.url)};
    const memory = createTestOtel();
    export const records = memory.records;
    export const spans = memory.spans;
    export const tracer = memory.tracer;
    export const logger = memory.logger;
  `;
  const sdkSource = `
    import { logger, tracer } from 'observability-test-memory';
    export const startObservabilitySdk = () => ({
      tracer,
      logger,
      shutdown: async () => {},
    });
  `;
  const configSource = `export const publicAppConfig = ${JSON.stringify({
    mode,
    api: {
      baseUrl: 'https://api.example.test',
      intranetBaseUrl: 'https://intranet.example.test',
    },
    observability: { otelEndpoint: enabled ? '/otel' : undefined },
  })};`;

  try {
    const result = await build({
      absWorkingDir: root,
      stdin: {
        resolveDir: root,
        contents: `
          export { captureException, getSupportErrorId } from '@/observability/capture/exception';
          export { observeUserLoad } from '@/observability/user';
          export { installObservability } from '@/observability/_internal/install';
          export { ErrorAggregation } from '@/observability/_internal/aggregation';
          export { sanitizeDiagnosticText } from '@/observability/_internal/privacy';
          export {
            markHttpExceptionObserved,
            recordHttpFailure,
          } from '@/observability/http';
          export { reportHttpFailure } from '@/apis/_internal/httpFailureTelemetry';
          export { applyXhrApiAttributes } from '@/apis/_internal/xhrApiTelemetry';
          export { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';
          export {
            FRONTEND_CLIENT_ERROR,
            FRONTEND_NETWORK_ERROR,
            parseErrorMessage,
            WisePenError,
          } from '@/utils/error';
          export { buildErrorDetail } from '@/components/business/ErrorPage/errorDetail';
          export { buildInfo } from '@/config/buildInfo';
          export { default as i18n } from '@/i18n';
          export { context as otelContext, trace } from '@opentelemetry/api';
          export { records, spans, tracer } from 'observability-test-memory';
          ${entry}
        `,
      },
      bundle: true,
      platform: 'node',
      format: 'esm',
      packages: 'external',
      tsconfig: path.join(root, 'tsconfig.app.json'),
      write: false,
      define: {
        __APP_VERSION__: '"test-version"',
        __APP_BUILD_INFO__: JSON.stringify(fakeBuildInfo),
        'import.meta.env.DEV': 'true',
      },
      alias: {
        '@': path.join(root, 'src'),
        '@domain-apis': path.join(root, 'src/domains/_registry/apis.impl.ts'),
      },
      plugins: [
        {
          name: 'observability-test-boundaries',
          setup(builder) {
            builder.onResolve({ filter: /.*/ }, ({ path }) =>
              Object.hasOwn(stubs, path) ? { path, namespace: 'controlled' } : undefined
            );
            builder.onLoad({ filter: /.*/, namespace: 'controlled' }, ({ path }) => ({
              contents: stubs[path],
              resolveDir: root,
              loader: 'tsx',
            }));
            builder.onResolve({ filter: /^observability-test-memory$/ }, () => ({
              path: 'memory',
              namespace: 'observability-test',
            }));
            builder.onResolve({ filter: /(?:^|\/)runtimeConfig$/ }, () => ({
              path: 'config',
              namespace: 'observability-test',
            }));
            builder.onResolve({ filter: /^\.\/sdk$/ }, (args) => {
              if (!args.importer.endsWith('/src/observability/_internal/install.ts')) return;
              return { path: 'sdk', namespace: 'observability-test' };
            });
            builder.onLoad({ filter: /.*/, namespace: 'observability-test' }, ({ path }) => ({
              contents: path === 'config' ? configSource : path === 'sdk' ? sdkSource : oTelSource,
              resolveDir: root,
              loader: 'js',
            }));
          },
        },
      ],
    });
    await writeFile(moduleFile, result.outputFiles[0].text);
    const loaded = await import(pathToFileURL(moduleFile).href);
    testContext.after(() => rm(directory, { recursive: true, force: true }));
    return loaded;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
};

export { createTestOtel };
