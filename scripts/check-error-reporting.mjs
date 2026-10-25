import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { AxiosError } from 'axios';
import { build } from 'esbuild';
import { loadConfigFromFile } from 'vite';

const root = process.cwd();
await mkdir('node_modules/.cache', { recursive: true });
const temp = await mkdtemp(path.join(root, 'node_modules/.cache/check-error-reporting-'));
const identity = {
  version: '1.0.0',
  commit: 'a'.repeat(40),
  buildId: 'fixture',
  mode: 'production',
  release: 'fixture-release',
  dirty: false,
};
const defines = {
  __APP_BUILD_INFO__: JSON.stringify(identity),
};
const records = { logs: [], spans: [], options: [] };
globalThis.__errorReportingCheck = records;

try {
  const output = path.join(temp, 'reporting.mjs');
  await build({
    stdin: {
      contents: `
        export * from '@/utils/error/reportError';
        export { WisePenError } from '@/utils/error/WisePenError';
        export * from '@/utils/error/codes';
        export { parseErrorMessage } from '@/utils/error/parseErrorMessage';
        export { default as i18n } from '@/i18n';
        export * from '@/telemetry/privacy';
        export { allowErrorReport, installOtelErrorReporter } from '@/telemetry/errorReporter';
        export { reportHttpFailure } from '@/telemetry/httpFailure';
        export { useApi, useApiPagination, useApiInfiniteScroll } from '@/hooks/useApi';
        export { createDrawioSaveSession } from '@/components/editors/drawio/drawioSaveSession';
      `,
      resolveDir: root,
    },
    outfile: output,
    bundle: true,
    platform: 'node',
    format: 'esm',
    define: defines,
    alias: { '@': path.join(root, 'src') },
    plugins: [
      {
        name: 'existing-runtime-seams',
        setup(builder) {
          builder.onResolve(
            { filter: /^\.\/otel$|^@heroui\/react$|^ahooks\/es\// },
            ({ path }) => ({ path, namespace: 'check' })
          );
          builder.onLoad({ filter: /.*/, namespace: 'check' }, ({ path: module }) => ({
            contents:
              {
                './otel': `
                export const isTelemetryEnabled = true;
                export const logger = { emit(record) { globalThis.__errorReportingCheck.logs.push(record); } };
                export const tracer = { startSpan(name, options) {
                  const span = { attributes: options.attributes, setStatus() {}, end() { this.ended = true; } };
                  globalThis.__errorReportingCheck.spans.push(span); return span;
                } };
              `,
                '@heroui/react': `export const toast = { danger() {} };`,
              }[module] ??
              `export default function(service, options) {
              globalThis.__errorReportingCheck.options.push(options); return {};
            }`,
          }));
        },
      },
    ],
  });
  const api = await import(pathToFileURL(output).href);
  globalThis.window = {
    location: { origin: 'https://app.example', pathname: '/chat/private-session' },
  };
  for (const language of ['zh-CN', 'en-US']) {
    await api.i18n.changeLanguage(language);
    const unknownMessage = api.i18n.t('common.unknown', { ns: 'errors' });
    for (const [source, codes] of [
      ['http', api.FRONTEND_NETWORK_ERROR],
      ['client', api.FRONTEND_CLIENT_ERROR],
    ]) {
      for (const code of Object.values(codes)) {
        const error = new api.WisePenError({ code, source });
        assert.notEqual(
          api.parseErrorMessage(error),
          unknownMessage,
          `${language}: 已定义的 ${source} 错误码 ${code} 不应显示未知错误`
        );
      }
    }
    const serverError = new api.WisePenError({
      code: 999999,
      source: 'api',
      serverMsg: 'server fallback',
    });
    assert.equal(api.parseErrorMessage(serverError), 'server fallback');
    assert.equal(api.parseErrorMessage(null), unknownMessage);
  }
  const observed = [];
  api.configureErrorReporter((report) => observed.push(report));
  const primitiveId = api.reportError('private-document-body', { origin: 'unhandled-rejection' });
  assert.equal(observed.at(-1).id, primitiveId);
  assert.equal(api.getErrorReportId('private-document-body'), primitiveId);
  const original = new Error('private-server-message');
  const wrapped = new api.WisePenError({ code: 14, source: 'http', cause: original });
  assert.equal(api.getErrorReportId(original), api.getErrorReportId(wrapped));
  api.reportError(original, { origin: 'http' });
  const count = observed.length;
  api.reportError(wrapped, { origin: 'handled', flow: 'login', operation: 'login' });
  assert.equal(observed.length, count);
  for (const error of [
    new DOMException('', 'AbortError'),
    new api.WisePenError({ code: 12, source: 'network' }),
    new api.WisePenError({ code: 401, source: 'api' }),
    new api.WisePenError({ code: 3111, source: 'api' }),
    new api.WisePenError({ code: 3121, source: 'api' }),
    new api.WisePenError({ code: 175, source: 'client' }),
  ]) {
    assert(api.isExpectedError(error));
    api.reportError(error, { origin: 'handled' });
  }
  assert.equal(observed.length, count);
  api.configureErrorReporter(() => {
    throw new Error('receiver unavailable');
  });
  assert.doesNotThrow(() => api.reportError(new Error('failure'), { origin: 'window-error' }));
  api.configureErrorReporter(() => Promise.reject(new Error('receiver unavailable')));
  api.reportError(new Error('failure'), { origin: 'window-error' });
  await new Promise((resolve) => setImmediate(resolve));

  api.configureErrorReporter((report) => observed.push(report));
  let customCalls = 0;
  let effects = 0;
  for (const hook of [api.useApi, api.useApiPagination, api.useApiInfiniteScroll]) {
    hook(async () => undefined, {
      errorReportContext: { flow: 'login', operation: 'login' },
      onError: () => {
        customCalls += 1;
      },
      onErrorEffect: () => {
        effects += 1;
      },
      showErrorToast: false,
    });
    const error = new Error('password-secret');
    records.options.at(-1).onError(error, [{ password: 'password-secret' }]);
    assert.equal(observed.at(-1).error.message, error.message);
    assert(!JSON.stringify(observed.at(-1)).includes('"password":'));
  }
  assert.equal(customCalls, 3);
  assert.equal(effects, 0);
  api.useApi(async () => undefined, {
    errorReportContext: { flow: 'login', operation: 'login' },
    showErrorToast: false,
    onErrorEffect: () => {
      effects += 1;
    },
  });
  records.options.at(-1).onError(new Error('hidden toast'), []);
  assert.equal(effects, 1);

  // 检查实际 SDK 装配中的隐私边界；不启动网络或替代浏览器验收。
  const sdkOutput = path.join(temp, 'sdk.mjs');
  globalThis.sessionStorage = { getItem: () => 'password-secret', setItem() {} };
  await build({
    entryPoints: ['src/telemetry/otel.ts'],
    outfile: sdkOutput,
    bundle: true,
    platform: 'node',
    format: 'esm',
    define: defines,
    alias: { '@': path.join(root, 'src') },
    plugins: [
      {
        name: 'sdk-config-seam',
        setup(builder) {
          builder.onResolve(
            {
              filter:
                /^@\/config\/runtimeConfig$|^@opentelemetry\/(browser-sdk|context-zone|instrumentation-fetch|instrumentation-xml-http-request)$/,
            },
            (args) => ({ path: args.path, namespace: 'sdk-check' })
          );
          builder.onLoad({ filter: /.*/, namespace: 'sdk-check' }, ({ path: module }) => ({
            contents:
              module === '@/config/runtimeConfig'
                ? `export const publicAppConfig = { mode: 'production', api: { baseUrl: 'https://api.example', intranetBaseUrl: 'https://intranet.example' }, observability: { otelEndpoint: 'https://api.example/otel' } };`
                : module.endsWith('/browser-sdk')
                  ? `export function startBrowserSdk(config) { globalThis.__errorReportingCheck.sdk = config; return {}; }`
                  : module.endsWith('/context-zone')
                    ? `export class ZoneContextManager {}`
                    : module.endsWith('/instrumentation-fetch')
                      ? `export class FetchInstrumentation { constructor(options) { this.options = options; } }`
                      : `export class XMLHttpRequestInstrumentation { constructor(options) { this.options = options; } }`,
          }));
        },
      },
    ],
  });
  await import(pathToFileURL(sdkOutput).href);
  const sdk = records.sdk;
  assert(sdk);
  assert.match(sdk.resourceAttributes['session.id'], /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i);
  assert.equal(sdk.resourceAttributes['wisepen.release_id'], identity.release);
  for (const instrumentation of sdk.instrumentations) {
    const ignored = (url) =>
      instrumentation.options.ignoreUrls.some((pattern) => pattern.test(url));
    assert(!ignored('https://api.example/auth/login?token=password-secret'));
    assert(!ignored('https://intranet.example/auth/login'));
    assert(ignored('https://api.example.evil/auth/login'));
    assert(ignored('https://oss.example/private-document-body?signature=password-secret'));
    assert(ignored('https://api.example/otel/v1/logs'));
  }
  const networkSpan = {
    attributes: {
      'url.full': 'https://api.example/auth/login?token=password-secret#private-document-body',
    },
    setAttribute(key, value) {
      this.attributes[key] = value;
    },
  };
  sdk.traces.processors[0].onStart(networkSpan);
  assert.equal(networkSpan.attributes['url.full'], 'https://api.example/auth/login');

  api.installOtelErrorReporter();
  const failure = new Error('password-secret private-document-body');
  failure.stack =
    'Error: password-secret\n    at private-document-body (https://app.example/assets/app-abc12345.js?token=password-secret:1:33)\n    at external (https://third-party.example/assets/secret.js:1:2)';
  api.reportError(failure, {
    origin: 'handled',
    flow: 'editor',
    operation: 'skill-save',
    pathname: '/resources/private-document-body/private-id?token=password-secret',
    componentStack: 'private-document-body',
  });
  assert.equal(records.logs.length, 1);
  const event = records.logs[0];
  assert.equal(event.attributes['wisepen.release_id'], identity.release);
  assert.equal(event.attributes['error.stack'], 'assets/app-abc12345.js:1:33');
  assert.equal(event.attributes['page.path'], '/resources/:id');
  const serialized = JSON.stringify(event);
  for (const secret of [
    'password-secret',
    'private-document-body',
    'private-id',
    'third-party.example',
    '?token=',
  ])
    assert(!serialized.includes(secret));
  assert(records.spans[0].ended);
  api.reportError('password-secret without stack', {
    origin: 'window-error',
    location: {
      filename: 'https://app.example/assets/app-abc12345.js?token=password-secret',
      line: 1,
      column: 33,
    },
  });
  assert.equal(records.logs.at(-1).attributes['error.stack'], 'assets/app-abc12345.js:1:33');
  api.reportError({ body: 'private-document-body' }, { origin: 'unhandled-rejection' });
  assert.equal(records.logs.at(-1).attributes['error.location_available'], false);
  assert(!Object.hasOwn(records.logs.at(-1).attributes, 'error.stack'));
  const httpFailure = Object.assign(new AxiosError('private server body'), {
    config: {
      url: '/auth/login?token=password-secret',
      baseURL: 'https://api.example',
      method: 'post',
    },
    response: {
      status: 500,
      headers: { 'x-request-id': 'a'.repeat(32) },
      data: { code: 5100, msg: 'private-document-body', data: null },
    },
  });
  api.reportHttpFailure(httpFailure);
  const httpEvent = records.logs.at(-1);
  assert.equal(httpEvent.attributes['error.type'], 'AxiosError');
  assert.equal(httpEvent.attributes['api.endpoint'], '/auth/login');
  assert.equal(httpEvent.attributes['api.business_code'], 5100);
  assert.equal(httpEvent.attributes['wisepen.request_id'], 'a'.repeat(32));
  assert.equal(httpEvent.attributes['http.request.method'], 'POST');
  const httpLogCount = records.logs.length;
  const mappedHttpFailure = new api.WisePenError({ code: 5100, source: 'api', cause: httpFailure });
  api.reportError(mappedHttpFailure, { origin: 'handled', flow: 'login', operation: 'login' });
  assert.equal(records.logs.length, httpLogCount);
  assert.equal(api.getErrorReportId(mappedHttpFailure), httpEvent.attributes['error.id']);
  const rejectedRequestId = Object.assign(new Error('private server body'), {
    config: httpFailure.config,
    response: {
      status: 503,
      headers: { 'x-request-id': 'password-secret' },
      data: { code: 5101, msg: 'private-document-body', data: null },
    },
  });
  api.reportHttpFailure(rejectedRequestId);
  assert(!Object.hasOwn(records.logs.at(-1).attributes, 'wisepen.request_id'));
  assert(!JSON.stringify(records.logs).includes('password-secret'));
  assert(!JSON.stringify(records.logs).includes('private-document-body'));
  assert.equal(
    api.safeNetworkUrl(
      'https://api.example/auth/login?token=password-secret#private-document-body'
    ),
    'https://api.example/auth/login'
  );
  assert.equal(
    api.safeNetworkUrl(
      'https://user:password-secret@api.example/resource/item/renameResource?resourceId=private-id#private-document-body'
    ),
    'https://api.example/resource/item/renameResource'
  );
  assert.equal(
    api.safeNetworkUrl('https://api.example/private-document-body?token=password-secret'),
    'https://api.example/:endpoint'
  );
  assert.deepEqual(api.safeStackFrames('no location'), []);
  assert.deepEqual(api.safeStackFrames('at https://app.example/assets/app-abc12345.js:0:0'), []);

  const limitStart = Math.floor(performance.now()) + 60_000;
  assert(api.allowErrorReport('limit-check', limitStart));
  assert(!api.allowErrorReport('limit-check', limitStart + 59_999));
  for (let index = 0; index < 19; index += 1)
    assert(api.allowErrorReport(`limit-${index}`, limitStart));
  assert(!api.allowErrorReport('over-limit', limitStart));
  assert(api.allowErrorReport('limit-check', limitStart + 60_000));

  let saveFailures = 0;
  const session = api.createDrawioSaveSession({
    initialXml: 'old',
    initialVersion: 1,
    exportXml() {},
    persistXml: async () => {
      throw new Error('private XML');
    },
    createFailure: () => new Error('disposed'),
    onFailure: () => {
      saveFailures += 1;
    },
  });
  await assert.rejects(session.saveXml('new'));
  assert.equal(session.getSnapshot().saveState, 'failed');
  assert.equal(saveFailures, 1);
  const pending = session.requestSave();
  session.dispose();
  await assert.rejects(pending);
  assert.equal(saveFailures, 1);

  const { config } = await loadConfigFromFile({ command: 'build', mode: 'production' });
  const { config: rebuilt } = await loadConfigFromFile({ command: 'build', mode: 'production' });
  const artifactBuild = JSON.parse(config.define.__APP_BUILD_INFO__);
  const rebuiltInfo = JSON.parse(rebuilt.define.__APP_BUILD_INFO__);
  assert.equal(artifactBuild.commit, rebuiltInfo.commit);
  assert.notEqual(artifactBuild.release, rebuiltInfo.release);
  const plugin = config.plugins.find((plugin) => plugin.name === 'wisepen-debug-artifacts');
  const dist = path.join(temp, 'candidate');
  await build({
    stdin: {
      contents: 'export function fail() {\n  throw new Error("private XML");\n}',
      sourcefile: 'probe.ts',
      resolveDir: temp,
    },
    outfile: path.join(dist, 'assets/probe.mjs'),
    format: 'esm',
    sourcemap: 'external',
    minify: true,
    banner: { js: '// unmapped banner' },
  });
  await plugin.writeBundle({ dir: dist });
  await assert.rejects(readFile(path.join(dist, 'assets/probe.mjs.map')));
  assert.deepEqual(
    JSON.parse(await readFile(path.join(dist, 'build-info.json'), 'utf8')),
    artifactBuild
  );
  const artifacts = path.join(temp, '.wisepen-debug', artifactBuild.release);
  await writeFile(path.join(dist, 'index.html'), '<div id="root"></div>');
  const releaseFile = path.join(temp, 'release.json');
  const releaseCommand = [
    'scripts/jenkins/create-release-manifest.mjs',
    '--dist',
    dist,
    '--out',
    releaseFile,
    '--release',
    artifactBuild.commit.slice(0, 8),
    '--build-mode',
    artifactBuild.mode,
  ];
  execFileSync(process.execPath, releaseCommand);
  const published = JSON.parse(await readFile(releaseFile, 'utf8'));
  assert.equal(published.release, artifactBuild.release);
  assert.deepEqual(published.build, artifactBuild);
  assert(!published.files.some((file) => file.endsWith('.map')));
  await writeFile(path.join(dist, 'leak.js.map'), '{}');
  assert.equal(spawnSync(process.execPath, releaseCommand, { encoding: 'utf8' }).status, 1);
  await rm(path.join(dist, 'leak.js.map'));
  const wrongRevision = [...releaseCommand];
  wrongRevision[wrongRevision.indexOf('--release') + 1] = 'bbbbbbbb';
  assert.equal(spawnSync(process.execPath, wrongRevision, { encoding: 'utf8' }).status, 1);
  const probe = await import(pathToFileURL(path.join(dist, 'assets/probe.mjs')).href);
  let frame;
  try {
    probe.fail();
  } catch (error) {
    frame = error.stack.match(/probe\.mjs:(\d+):(\d+)/);
  }
  assert(frame);
  const command = [
    'scripts/symbolicate-error.mjs',
    '--artifacts',
    artifacts,
    '--release',
    artifactBuild.release,
    '--frame',
    `assets/probe.mjs:${frame[1]}:${frame[2]}`,
  ];
  const result = JSON.parse(execFileSync(process.execPath, command, { encoding: 'utf8' }));
  assert(result.fileName.endsWith('probe.ts'));
  assert.equal(result.lineNumber, 2);
  const mismatch = [...command];
  mismatch[mismatch.indexOf('--release') + 1] = 'wrong-release';
  assert.equal(spawnSync(process.execPath, mismatch, { encoding: 'utf8' }).status, 1);
  const unmapped = [...command];
  unmapped[unmapped.indexOf('--frame') + 1] = 'assets/probe.mjs:1:1';
  assert.equal(spawnSync(process.execPath, unmapped, { encoding: 'utf8' }).status, 1);
  unmapped[unmapped.indexOf('--frame') + 1] = 'assets/probe.mjs:999999:1';
  assert.equal(spawnSync(process.execPath, unmapped, { encoding: 'utf8' }).status, 1);
  await writeFile(path.join(artifacts, 'assets/probe.mjs.map'), '{}');
  assert.equal(spawnSync(process.execPath, command, { encoding: 'utf8' }).status, 1);
  console.log(
    '错误上报检查通过：错误码文案／Axios 分类／编号／SDK 隐私边界／白名单／回调／限流／保存失败／构建身份／附件隔离／行号还原'
  );
} finally {
  delete globalThis.__errorReportingCheck;
  delete globalThis.window;
  delete globalThis.sessionStorage;
  await rm(temp, { recursive: true, force: true });
}
