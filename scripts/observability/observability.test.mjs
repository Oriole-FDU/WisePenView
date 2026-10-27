import assert from 'node:assert/strict';
import { test } from 'node:test';

import { installBrowser, loadObservability } from './harness.mjs';

const createRouter = (state) => {
  const listeners = new Set();
  let current = state;
  return {
    get state() {
      return current;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    navigate(next) {
      current = next;
      for (const listener of listeners) listener(next);
    },
    listenerCount() {
      return listeners.size;
    },
  };
};

const routeState = (key, routePath, params = {}) => ({
  matches: [
    {
      route: { path: routePath },
      params,
    },
  ],
  location: { key },
  navigation: { state: 'idle' },
});

const errorEvent = (fingerprint, now = 0) => ({
  name: 'frontend.error',
  severity: 'ERROR',
  message: fingerprint,
  timestamp: now,
  attributes: {
    'error.fingerprint': fingerprint,
    'error.detector': 'window-error',
  },
});

test('错误详情与请求契约文案使用构建身份和统一错误码', async (context) => {
  installBrowser(context);
  const telemetry = await loadObservability(context);
  const detail = telemetry.buildErrorDetail(new Error('detail'), '/chat', 'WPE-TEST');
  for (const value of Object.values(telemetry.buildInfo)) assert(detail.includes(String(value)));
  for (const [language, expected] of [
    ['zh-CN', '服务器响应格式异常，请稍后重试'],
    ['en-US', 'The server returned an invalid response. Please try again later.'],
  ]) {
    await telemetry.i18n.changeLanguage(language);
    assert.equal(
      telemetry.parseErrorMessage(new telemetry.WisePenError({ source: 'http', code: 16 })),
      expected
    );
  }
  await telemetry.i18n.changeLanguage('zh-CN');
});

test('关闭时没有监听、定时器、存储标识或 OTel 事件，但 support ID 仍可用', async (context) => {
  const browser = installBrowser(context);
  const telemetry = await loadObservability(context, { enabled: false });
  const router = createRouter(routeState('one', '/chat'));
  const stop = telemetry.installObservability({ router });

  assert.equal(browser.listenerCount(), 0);
  assert.equal(browser.timers.size, 0);
  assert.equal(browser.localStorage.getItem('wisepen:telemetry:client'), null);
  assert.equal(browser.sessionStorage.getItem('wisepen.otel.session'), null);
  const error = new Error('disabled');
  const id = telemetry.captureException(error, { detector: 'window-error' });
  assert.match(id, /^WPE-[A-Z0-9]{8}$/);
  assert.equal(telemetry.getSupportErrorId(error), id);
  assert.equal(telemetry.records.length, 0);
  assert.equal(telemetry.spans.length, 0);
  stop();
});

test('首次异常写日志和短 span，同对象跨入口只捕获一次，用户与路由上下文保持', async (context) => {
  const browser = installBrowser(context);
  const telemetry = await loadObservability(context);
  const router = createRouter(
    routeState('resource-one', '/resources/:resourceType/:resourceId', {
      resourceType: 'note',
      resourceId: 'note-one',
    })
  );
  const stop = telemetry.installObservability({ router });
  context.after(stop);

  await telemetry.observeUserLoad(async () => ({ id: 'user-one' }));
  const error = new Error('render failed');
  const id = telemetry.captureException(error, {
    detector: 'root-fallback',
    componentStack: '\n at PrivateComponent',
  });
  assert.equal(telemetry.captureException(error, { detector: 'window-error' }), id);

  assert.equal(telemetry.records.length, 1);
  assert.equal(telemetry.records[0].attributes['error.id'], id);
  assert.equal(telemetry.records[0].attributes['error.detector'], 'root-fallback');
  assert.equal(telemetry.records[0].attributes['exception.type'], 'Error');
  assert.equal(telemetry.records[0].attributes['user.id'], 'user-one');
  assert.equal(
    telemetry.records[0].attributes['page.route'],
    '/resources/:resourceType/:resourceId'
  );
  assert.equal(telemetry.records[0].attributes['resource.id'], 'note-one');
  assert.equal(telemetry.records[0].attributes['editor.type'], 'note');
  assert.equal(telemetry.records[0].attributes['error.origin'], undefined);
  assert.equal(telemetry.records[0].attributes['error.boundary'], undefined);
  assert.equal(telemetry.records[0].attributes['error.disposition'], undefined);

  const errorSpans = telemetry.spans.filter((span) => span.name === 'frontend.error');
  assert.equal(errorSpans.length, 1);
  assert.equal(errorSpans[0].ended, true);
  assert(browser.listenerCount() > 0);
  assert.equal(browser.timers.size, 1);
  stop();
});

test('活动 span 只增加 exception event；recoverable 使用 WARN 且不创建额外错误 span', async (context) => {
  installBrowser(context);
  const telemetry = await loadObservability(context);
  const router = createRouter(routeState('chat', '/chat'));
  const stop = telemetry.installObservability({ router });
  context.after(stop);

  const activeSpan = telemetry.tracer.startSpan('operation');
  const spanContext = telemetry.trace.setSpan(telemetry.otelContext.active(), activeSpan);
  telemetry.otelContext.with(spanContext, () => {
    telemetry.captureException(new Error('inside operation'), { detector: 'window-error' });
  });
  activeSpan.end();

  assert.equal(telemetry.records.length, 1);
  assert.equal(telemetry.records[0].spanContext.spanId, activeSpan.spanContext().spanId);
  assert.equal(telemetry.spans.filter((span) => span.name === 'frontend.error').length, 0);
  assert(activeSpan.events.some(({ name }) => name === 'exception'));

  telemetry.captureException(new Error('recoverable'), {
    detector: 'react-root-recoverable',
  });
  assert.equal(telemetry.records.at(-1).severityText, 'WARN');
  stop();
});

test('每个框架入口写入独立 detector，primitive capture ID 与日志一致', async (context) => {
  installBrowser(context);
  const telemetry = await loadObservability(context);
  const stop = telemetry.installObservability({
    router: createRouter(routeState('chat', '/chat')),
  });
  context.after(stop);

  const detectors = [
    'react-root-uncaught',
    'react-root-recoverable',
    'root-fallback',
    'route-fallback',
    'router-error',
    'window-error',
    'window-unhandled-rejection',
  ];
  for (const detector of detectors) {
    telemetry.captureException(new Error(detector), { detector });
  }
  assert.deepEqual(
    telemetry.records.map((record) => record.attributes['error.detector']),
    detectors
  );

  const primitiveId = telemetry.captureException('primitive failure', {
    detector: 'window-error',
  });
  assert.equal(telemetry.records.at(-1).attributes['error.id'], primitiveId);
  assert.equal(telemetry.getSupportErrorId('primitive failure'), primitiveId);
  stop();
});

test('全局 ErrorEvent 保留脱敏位置和 stack，无效坐标不写入源码位置', async (context) => {
  const browser = installBrowser(context);
  const telemetry = await loadObservability(context);
  const stop = telemetry.installObservability({
    router: createRouter(routeState('chat', '/chat')),
  });
  context.after(stop);

  const error = new Error(
    'failed https://api.example.test/path?token=private Bearer secret me@example.test'
  );
  error.stack =
    'Error: failed\n    at run (https://app.example.test/assets/main.js?token=private:1:2)';
  browser.dispatch('window', 'error', {
    error,
    message: error.message,
    filename: 'https://app.example.test/assets/main.js?token=private',
    lineno: 2,
    colno: 3,
  });
  const record = telemetry.records[0];
  assert.equal(record.attributes['error.detector'], 'window-error');
  assert.equal(record.attributes['code.file.path'], 'https://app.example.test/assets/main.js');
  assert.equal(record.attributes['code.line.number'], 2);
  assert.equal(record.attributes['code.column.number'], 3);
  const serialized = JSON.stringify(record);
  assert.ok(!serialized.includes('token=private'));
  assert.ok(!serialized.includes('Bearer secret'));
  assert.ok(!serialized.includes('me@example.test'));

  telemetry.captureException(
    new telemetry.WisePenError({
      code: 5421,
      source: 'api',
      serverMsg: 'private server body me@example.test',
    }),
    { detector: 'window-unhandled-rejection' }
  );
  assert.equal(telemetry.records.at(-1).attributes['exception.message'], 'api failure (5421)');
  assert.ok(!JSON.stringify(telemetry.records.at(-1)).includes('private server body'));

  browser.dispatch('window', 'error', {
    error: 'primitive failure',
    message: 'primitive failure',
    filename: '',
    lineno: 0,
    colno: -1,
  });
  assert.equal(telemetry.records.at(-1).attributes['code.file.path'], undefined);
  stop();
});

test('认证切换、迟到用户结果、路由和可见性上下文正确归属', async (context) => {
  const browser = installBrowser(context);
  const telemetry = await loadObservability(context);
  const router = createRouter(routeState('one', '/chat'));
  const stop = telemetry.installObservability({ router });
  context.after(stop);

  await telemetry.observeUserLoad(async () => ({ id: 'user-a' }));
  telemetry.captureException(new Error('first'), { detector: 'window-error' });
  const firstRecord = telemetry.records.at(-1);
  const firstSession = firstRecord.attributes['session.id'];
  assert.equal(firstRecord.attributes['user.id'], 'user-a');

  telemetry.authSessionCoordinator.publish('logout');
  const second = new Error('second');
  telemetry.captureException(second, { detector: 'window-error' });
  const secondRecord = telemetry.records.at(-1);
  assert.equal(secondRecord.attributes['user.id'], undefined);
  assert.notEqual(secondRecord.attributes['session.id'], firstSession);

  const lateUser = Promise.withResolvers();
  const loadingUser = telemetry.observeUserLoad(() => lateUser.promise);
  telemetry.authSessionCoordinator.publish('login');
  lateUser.resolve({ id: 'late-user' });
  await loadingUser;
  telemetry.captureException(new Error('after late user'), { detector: 'window-error' });
  assert.equal(telemetry.records.at(-1).attributes['user.id'], undefined);

  browser.document.visibilityState = 'hidden';
  browser.dispatch('document', 'visibilitychange');
  browser.navigator.onLine = false;
  browser.dispatch('window', 'offline');
  router.navigate(
    routeState('two', '/resources/:resourceType/:resourceId', {
      resourceType: 'pdf',
      resourceId: 'resource-two',
    })
  );
  telemetry.captureException(new Error('context'), { detector: 'window-error' });
  const contextRecord = telemetry.records.at(-1);
  assert.equal(contextRecord.attributes['page.route'], '/resources/:resourceType/:resourceId');
  assert.equal(contextRecord.attributes['resource.id'], 'resource-two');
  assert.equal(contextRecord.attributes['page.visibility'], 'hidden');
  assert.equal(contextRecord.attributes['network.online'], false);
  assert.match(contextRecord.attributes['telemetry.breadcrumbs'], /page\.visibility_changed/);
  assert.match(contextRecord.attributes['telemetry.breadcrumbs'], /network\.changed/);
  assert.match(contextRecord.attributes['telemetry.breadcrumbs'], /page\.navigation/);

  stop();
  assert.equal(browser.listenerCount(), 0);
  assert.equal(browser.timers.size, 0);
  assert.equal(router.listenerCount(), 0);
});

test('聚合保留首次事件、摘要计数、预算和 dropped 摘要', async (context) => {
  installBrowser(context);
  const telemetry = await loadObservability(context);
  let now = 0;
  const events = [];
  const aggregation = new telemetry.ErrorAggregation(
    (next) => events.push(next),
    () => now
  );
  for (let count = 0; count < 5; count++) aggregation.record(errorEvent('same', now));
  assert.equal(events.length, 1);
  now = 60_000;
  aggregation.flush();
  assert.equal(events.at(-1).name, 'frontend.error_summary');
  assert.equal(events.at(-1).attributes['error.occurrence_count'], 4);
  assert.equal(events.at(-1).attributes['error.total_count'], 5);

  now = 0;
  const budgetEvents = [];
  const budget = new telemetry.ErrorAggregation(
    (next) => budgetEvents.push(next),
    () => now
  );
  for (let count = 0; count < 250; count++) budget.record(errorEvent(`unique-${count}`, now));
  assert.equal(budgetEvents.length, 200);
  now = 60_000;
  budget.flush(true);
  assert.equal(budgetEvents.length, 201);
  assert.equal(budgetEvents.at(-1).name, 'telemetry.events_dropped');
  assert.equal(budgetEvents.at(-1).attributes['telemetry.dropped_count'], 50);
  budget.flush(true);
  assert.equal(budgetEvents.length, 201);

  now = 0;
  const evictedEvents = [];
  const evicted = new telemetry.ErrorAggregation(
    (next) => evictedEvents.push(next),
    () => now
  );
  evicted.record(errorEvent('oldest', now));
  evicted.record(errorEvent('oldest', now));
  for (let count = 0; count < 100; count++) evicted.record(errorEvent(`group-${count}`, now));
  assert.equal(evictedEvents.filter((next) => next.name === 'frontend.error_summary').length, 1);
});

test('HTTP 5xx 保持原事件语义，404 不记录，XHR API 属性仍可补充', async (context) => {
  installBrowser(context);
  const telemetry = await loadObservability(context);
  const stop = telemetry.installObservability({
    router: createRouter(
      routeState('resource', '/resources/:resourceType/:resourceId', {
        resourceType: 'note',
        resourceId: 'one',
      })
    ),
  });
  context.after(stop);

  telemetry.reportHttpFailure({
    config: { url: 'https://api.example.test/not-found?token=secret', method: 'get' },
    response: { status: 404, data: {}, headers: {} },
  });
  assert.equal(telemetry.records.length, 0);

  telemetry.reportHttpFailure({
    config: { url: 'https://api.example.test/failure?token=secret', method: 'post' },
    response: {
      status: 503,
      data: { code: 50001, msg: 'private server body' },
      headers: { 'x-request-id': 'request-123' },
    },
  });
  assert.equal(telemetry.records.length, 1);
  assert.equal(telemetry.records[0].attributes['http.response.status_code'], 503);
  assert.equal(telemetry.records[0].attributes['wisepen.request_id'], 'request-123');
  assert.equal(telemetry.records[0].attributes['url.path'], '/failure');
  assert.equal(telemetry.spans.filter((span) => span.name === 'frontend.http_failure').length, 1);

  const attributes = {};
  const span = {
    setAttributes(next) {
      Object.assign(attributes, next);
    },
  };
  telemetry.applyXhrApiAttributes(
    span,
    {
      responseURL: 'https://api.example.test/v1/resources/123',
      status: 200,
      getResponseHeader: () => 'application/json',
      responseText: JSON.stringify({ code: 5421, msg: 'private', data: null }),
    },
    new Set(['https://api.example.test'])
  );
  assert.equal(attributes['api.endpoint'], '/v1/resources/:id');
  assert.equal(attributes['api.outcome'], 'failure');
  assert.equal(attributes['api.business_code'], 5421);
  stop();
});
