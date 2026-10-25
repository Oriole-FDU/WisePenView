import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadTelemetry } from './harness.mjs';

const telemetry = await loadTelemetry();

function createContext(clock) {
  let sequence = 0;
  return new telemetry.TelemetryContext({
    attributes: { 'service.version': 'test' },
    sessionId: 'session-a',
    authVersion: 0,
    now: () => clock.now,
    createId: () => `session-${++sequence}`,
  });
}

test('近期事件按容量和时间淘汰，只保留白名单字段', () => {
  const clock = { now: 0 };
  const context = createContext(clock);
  for (let i = 0; i < 60; i++) {
    context.addBreadcrumb('http.request', {
      'api.endpoint': '/test',
      token: 'secret',
      body: '正文',
    });
  }
  const snapshot = context.capture();
  assert.equal(snapshot.breadcrumbs.length, 50);
  assert.equal(snapshot.attributes['telemetry.breadcrumbs_dropped'], 10);
  assert.deepEqual(snapshot.breadcrumbs[0].attributes, { 'api.endpoint': '/test' });
  clock.now = 120_001;
  assert.deepEqual(context.capture().breadcrumbs, []);
});

test('账号切换清空现场，旧请求与过期的身份结果不会污染新会话', () => {
  const context = createContext({ now: 0 });
  context.identify('user-a', 0);
  context.addBreadcrumb('page.navigation', { 'resource.id': 'note-a' });
  const old = context.capture();
  context.resetIdentity(1);
  assert.equal(context.identify('user-a', 0), false);
  assert.equal(context.identify('user-b', 1), true);
  context.addBreadcrumb('http.request', { 'api.endpoint': '/old-request' }, old);
  const current = context.capture();
  assert.equal(old.attributes['user.id'], 'user-a');
  assert.equal(current.attributes['user.id'], 'user-b');
  assert.notEqual(old.attributes['session.id'], current.attributes['session.id']);
  assert.deepEqual(current.breadcrumbs, []);
  assert.deepEqual(context.getBreadcrumbs(old), old.breadcrumbs);
});

test('首次错误完整发送，重复摘要只包含未发送次数，资源和会话独立聚合', () => {
  let now = 0;
  const events = [];
  const aggregation = new telemetry.ErrorAggregation(
    (event) => events.push(event),
    () => now
  );
  const event = {
    name: 'frontend.error',
    severity: 'ERROR',
    message: 'failure',
    timestamp: now,
    attributes: { 'error.fingerprint': 'same', 'session.id': 'a', 'resource.id': 'note-a' },
  };
  for (let i = 0; i < 10; i++) aggregation.record(event);
  assert.equal(events.length, 1);
  aggregation.record({ ...event, attributes: { ...event.attributes, 'resource.id': 'note-b' } });
  aggregation.record({ ...event, attributes: { ...event.attributes, 'session.id': 'b' } });
  assert.equal(events.length, 3);
  now = 60_000;
  aggregation.flush();
  assert.equal(events.length, 4);
  assert.equal(events[3].name, 'frontend.error_summary');
  assert.equal(events[3].attributes['error.occurrence_count'], 9);
  assert.equal(events[3].attributes['error.total_count'], 10);
  aggregation.flush(true);
  assert.equal(events.length, 4);
});

test('聚合缓存及发送速率有上限，丢弃数量可见，出口失败不影响业务', () => {
  let now = 0;
  const events = [];
  const aggregation = new telemetry.ErrorAggregation(
    (event) => events.push(event),
    () => now
  );
  for (let i = 0; i < 250; i++)
    aggregation.record({
      name: 'frontend.error',
      severity: 'ERROR',
      message: 'failure',
      timestamp: now,
      attributes: { 'error.fingerprint': `unique-${i}` },
    });
  assert.equal(events.length, 200);
  now = 60_000;
  aggregation.flush();
  assert.equal(events.at(-1).attributes['telemetry.dropped_count'], 50);
  const broken = new telemetry.ErrorAggregation(() => {
    throw new Error('出口异常');
  });
  assert.doesNotThrow(() =>
    broken.emit({ name: 'test', severity: 'INFO', message: '', attributes: {}, timestamp: 0 })
  );
});

test('聚合满额时发送被淘汰分组的摘要，页面结束时也报告预算丢弃数', () => {
  const events = [];
  const aggregation = new telemetry.ErrorAggregation(
    (event) => events.push(event),
    () => 0
  );
  const event = {
    name: 'frontend.error',
    severity: 'ERROR',
    message: 'failure',
    timestamp: 0,
    attributes: { 'error.fingerprint': 'oldest' },
  };
  aggregation.record(event);
  aggregation.record(event);
  for (let i = 0; i < 100; i++) {
    aggregation.record({ ...event, attributes: { 'error.fingerprint': `new-${i}` } });
  }
  const summary = events.find(({ name }) => name === 'frontend.error_summary');
  assert.equal(summary.attributes['error.occurrence_count'], 1);
  for (let i = 0; i < 200; i++) aggregation.emit(event);
  aggregation.flush(true);
  assert.equal(events.at(-1).name, 'telemetry.events_dropped');
  assert.ok(events.at(-1).attributes['telemetry.dropped_count'] > 0);
});

test('URL 参数、认证令牌和邮箱不进入诊断文本', () => {
  assert.equal(
    telemetry.readRequestPath('/test?token=secret#anchor', 'https://user:pass@api.test'),
    '/test'
  );
  const safe = telemetry.sanitizeDiagnosticText(
    'https://api.test/path?token=secret Bearer abc123 me@example.test'
  );
  assert.equal(safe, 'https://api.test/path Bearer [redacted] [email]');
});
