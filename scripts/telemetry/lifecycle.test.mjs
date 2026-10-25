import assert from 'node:assert/strict';
import { test } from 'node:test';

import { installBrowser, loadTelemetry } from './harness.mjs';

const telemetry = await loadTelemetry();
const mockTelemetry = await loadTelemetry('mock');
const disabledTelemetry = await loadTelemetry('development', '');

const route = (key, resourceId = 'note-123', state = 'idle') => ({
  matches: [
    {
      route: { path: '/resources/:resourceType/:resourceId' },
      params: { resourceType: 'note', resourceId },
    },
  ],
  navigation: { state },
  location: { key },
});

test('mock 和未配置 OTel 时不创建标识、span、监听或日志', async (context) => {
  const browser = installBrowser(context);
  for (const disabled of [mockTelemetry, disabledTelemetry]) {
    const stop = disabled.installTelemetry({});
    disabled.httpClient.defaults.adapter = async (config) => ({
      config,
      status: 200,
      statusText: '',
      headers: {},
      data: { code: 200, msg: 'ok', data: 42 },
    });
    assert.equal(await disabled.apiGet('/disabled'), 42);
    assert.equal(disabled.captureTelemetryContext(), undefined);
    assert.equal(disabled.records.length, 0);
    assert.equal(disabled.spans.length, 0);
    assert.equal(browser.listeners.size, 0);
    assert.equal(browser.timers.size, 0);
    assert.equal(localStorage.getItem('wisepen:telemetry:client'), null);
    assert.equal(sessionStorage.getItem('wisepen.otel.session'), null);
    stop();
  }
});

test('导航保留独立日志与真实 span；可见性和网络只留近期事件，所有监听可清理', (context) => {
  const browser = installBrowser(context);
  const { records, spans } = telemetry;
  let listener;
  let unsubscribed = false;
  const state = route('initial');
  const stop = telemetry.installTelemetry({
    state,
    subscribe(fn) {
      listener = fn;
      return () => {
        unsubscribed = true;
      };
    },
  });
  browser.cleanup(stop);
  assert.deepEqual(
    records.map((record) => record.attributes['event.name']),
    ['session.started', 'page.navigation']
  );
  assert.match(records.at(-1).spanContext.traceId, /^[a-f0-9]{32}$/);
  assert.equal(records.at(-1).spanContext.spanId, spans.at(-1).spanContext().spanId);
  listener(state);
  assert.equal(records.length, 2);
  browser.document.visibilityState = 'hidden';
  browser.listeners.get('document:visibilitychange')();
  browser.navigator.onLine = false;
  browser.listeners.get('window:offline')();
  assert.equal(records.length, 2);
  const snapshot = telemetry.captureTelemetryContext();
  assert.equal(snapshot.attributes['network.online'], false);
  assert.equal(snapshot.attributes['page.route'], '/resources/:resourceType/:resourceId');
  assert.equal(snapshot.attributes['resource.id'], 'note-123');
  assert.deepEqual(
    snapshot.breadcrumbs.slice(-2).map(({ name }) => name),
    ['page.visibility_changed', 'network.changed']
  );
  listener(route('initial', 'note-123', 'loading'));
  const pending = spans.at(-1);
  assert.equal(pending.ended, false);
  listener(route('next', 'note-next'));
  assert.equal(pending.ended, true);
  assert.equal(records.length, 3);
  assert.equal(records.at(-1).spanContext.spanId, pending.spanContext().spanId);
  assert.equal(records.at(-1).attributes['resource.id'], 'note-next');
  assert.equal(records.at(-1).attributes['network.online'], false);
  assert.ok(records.at(-1).attributes['telemetry.breadcrumbs'].includes('page.visibility_changed'));
  listener(route('next', 'note-next', 'loading'));
  const canceled = spans.at(-1);
  listener(route('next', 'note-next'));
  assert.equal(canceled.attributes['navigation.outcome'], 'canceled');
  assert.equal(canceled.ended, true);
  assert.equal(records.length, 3);
  listener(route('next', 'note-next', 'loading'));
  const unfinished = spans.at(-1);
  assert.equal(browser.timers.size, 1);
  stop();
  assert.equal(unfinished.ended, true);
  assert.equal(browser.timers.size, 0);
  assert.equal(browser.listeners.size, 0);
  assert.ok(unsubscribed);
});

test('旧账号的用户查询结果不能更新新会话身份', async (context) => {
  installBrowser(context);
  telemetry.captureTelemetryContext();
  const loaded = Promise.withResolvers();
  const pending = telemetry.loadTelemetryUser(() => loaded.promise);
  telemetry.authSessionCoordinator.publish('logout');
  telemetry.resetTelemetryIdentity('logout');
  loaded.resolve({ id: 'old-user' });
  await pending;
  assert.equal(telemetry.captureTelemetryContext().attributes['user.id'], undefined);
});

test('页面隐藏仍刷新重复错误摘要，不额外产生可见性日志', (context) => {
  const browser = installBrowser(context);
  telemetry.records.length = 0;
  const stop = telemetry.installTelemetry({ state: route('summary'), subscribe: () => () => {} });
  browser.cleanup(stop);
  telemetry.records.length = 0;
  for (let count = 0; count < 3; count++) {
    telemetry.reportError(new Error('repeat'), { origin: 'unhandled-rejection' });
  }
  assert.equal(telemetry.records.length, 1);
  browser.document.visibilityState = 'hidden';
  browser.listeners.get('document:visibilitychange')();
  assert.equal(telemetry.records.length, 2);
  assert.equal(telemetry.records.at(-1).attributes['event.name'], 'frontend.error_summary');
  assert.equal(telemetry.records.at(-1).attributes['error.occurrence_count'], 2);
});
