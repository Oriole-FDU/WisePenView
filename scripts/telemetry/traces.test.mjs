import assert from 'node:assert/strict';
import { test } from 'node:test';

import { context as otelContext, propagation, SpanStatusCode, trace } from '@opentelemetry/api';
import { AxiosError } from 'axios';

import { installBrowser, loadTelemetry } from './harness.mjs';

const telemetry = await loadTelemetry();
const response = (config, data, status = 200) => ({
  config,
  data,
  status,
  statusText: '',
  headers: {},
});

test('真实 OTel SDK 的请求、传输和日志共享 trace，重试与账号切换保持归属', async (context) => {
  installBrowser(context);
  const stop = telemetry.installOtelErrorReporter();
  context.after(stop);
  const { records, spans, tracer, httpClient } = telemetry;
  const reset = () => {
    telemetry.flushTelemetryEvents(true);
    records.length = 0;
    spans.length = 0;
  };
  const identify = (id) =>
    telemetry.identifyTelemetryUser(id, telemetry.authSessionCoordinator.getSessionVersion());
  const transport = () => {
    const span = tracer.startSpan('HTTP transport', {
      attributes: { 'url.full': 'https://api.example.test/test?token=secret' },
    });
    const carrier = {};
    otelContext.with(trace.setSpan(otelContext.active(), span), () => {
      propagation.inject(otelContext.active(), carrier);
    });
    span.end();
    return { span, carrier };
  };
  context.beforeEach(reset);
  identify('user-a');
  reset();

  await context.test(
    '成功请求有逻辑 span，传输子 span 与 traceparent 相连，不增加成功日志',
    async () => {
      let sent;
      httpClient.defaults.adapter = async (config) => {
        sent = transport();
        return response(config, { code: 200, msg: 'ok', data: 42 });
      };
      assert.equal(await telemetry.apiGet('/success?token=secret'), 42);
      const logical = spans.find((span) => span.name.startsWith('api.request'));
      assert.equal(sent.span.parentSpanContext.spanId, logical.spanContext().spanId);
      assert.equal(sent.span.spanContext().traceId, logical.spanContext().traceId);
      assert.equal(
        sent.carrier.traceparent,
        `00-${logical.spanContext().traceId}-${sent.span.spanContext().spanId}-01`
      );
      assert.equal(sent.span.attributes['url.full'], 'https://api.example.test/test');
      assert.equal(logical.attributes['api.outcome'], 'success');
      assert.ok(spans.every((span) => span.ended));
      assert.equal(records.length, 0);
      reset();
    }
  );

  await context.test(
    '三次重试共用一个逻辑 span，失败日志直接引用它，不另造错误 trace',
    async () => {
      const attempts = [];
      httpClient.defaults.adapter = async (config) => {
        attempts.push(transport());
        throw new AxiosError(
          'server failure',
          'ERR_BAD_RESPONSE',
          config,
          {},
          response(config, {}, 503)
        );
      };
      await assert.rejects(telemetry.apiGet('/retry', { retryDelayMs: 0 }));
      const logicals = spans.filter((span) => span.name.startsWith('api.request'));
      assert.equal(logicals.length, 1);
      assert.equal(attempts.length, 3);
      const logical = logicals[0];
      for (const { span } of attempts) {
        assert.equal(span.parentSpanContext.spanId, logical.spanContext().spanId);
        assert.equal(span.spanContext().traceId, logical.spanContext().traceId);
      }
      assert.equal(records.length, 1);
      assert.equal(records[0].spanContext.traceId, logical.spanContext().traceId);
      assert.equal(records[0].spanContext.spanId, logical.spanContext().spanId);
      assert.equal(logical.status.code, SpanStatusCode.ERROR);
      assert.equal(spans.length, 4);
      assert.ok(spans.every((span) => span.ended));
      reset();
    }
  );

  await context.test('HTTP 200 的业务失败与契约失败继续关联请求 trace', async () => {
    for (const [data, kind] of [
      [{ code: 40001, msg: 'failed', data: null }, 'business'],
      [{ unexpected: true }, 'contract'],
    ]) {
      httpClient.defaults.adapter = async (config) => {
        transport();
        return response(config, data);
      };
      await assert.rejects(telemetry.apiGet(`/${kind}`));
      const logical = spans.find((span) => span.name.startsWith('api.request'));
      assert.equal(records.at(-1).attributes['error.kind'], kind);
      assert.equal(records.at(-1).spanContext.traceId, logical.spanContext().traceId);
      assert.equal(records.at(-1).spanContext.spanId, logical.spanContext().spanId);
      assert.equal(spans.length, 2);
      assert.ok(spans.every((span) => span.ended));
      reset();
    }
  });

  await context.test('延迟发送的重复摘要保留首次请求 trace，不借用定时器现场', async () => {
    httpClient.defaults.adapter = async (config) => {
      transport();
      throw new AxiosError(
        'server failure',
        'ERR_BAD_RESPONSE',
        config,
        {},
        response(config, {}, 503)
      );
    };
    await assert.rejects(telemetry.apiGet('/repeated', { retry: false }));
    const first = records[0].spanContext;
    await assert.rejects(telemetry.apiGet('/repeated', { retry: false }));
    assert.equal(records.length, 1);
    const unrelated = tracer.startSpan('unrelated timer');
    otelContext.with(trace.setSpan(otelContext.active(), unrelated), () => {
      telemetry.flushTelemetryEvents(true);
    });
    unrelated.end();
    assert.equal(records.length, 2);
    assert.equal(records[1].attributes['event.name'], 'frontend.error_summary');
    assert.equal(records[1].spanContext.traceId, first.traceId);
    assert.equal(records[1].spanContext.spanId, first.spanId);
    reset();
  });

  await context.test('请求取消会结束逻辑 span，不产生错误日志', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(telemetry.apiGet('/cancel', { signal: controller.signal }));
    assert.equal(records.length, 0);
    assert.equal(spans.length, 1);
    assert.equal(spans[0].ended, true);
    reset();
  });

  await context.test('切换账号后的重试子 span 和失败日志仍属于发起请求的旧账号', async () => {
    const started = Promise.withResolvers();
    const finish = Promise.withResolvers();
    let attempt = 0;
    httpClient.defaults.adapter = async (config) => {
      transport();
      if (attempt++ === 0) {
        started.resolve();
        await finish.promise;
      }
      throw new AxiosError(
        'server failure',
        'ERR_BAD_RESPONSE',
        config,
        {},
        response(config, {}, 503)
      );
    };
    const pending = telemetry.apiGet('/old-account', { retry: 1, retryDelayMs: 0 });
    await started.promise;
    const logical = spans.find((span) => span.name.startsWith('api.request'));
    telemetry.authSessionCoordinator.publish('login');
    telemetry.resetTelemetryIdentity('login');
    identify('user-b');
    records.length = 0;
    finish.resolve();
    await assert.rejects(pending);
    assert.equal(attempt, 2);
    assert.equal(records.at(-1).attributes['user.id'], 'user-a');
    assert.equal(records.at(-1).spanContext.traceId, logical.spanContext().traceId);
    assert.ok(spans.every((span) => span.attributes['user.id'] === 'user-a'));
    assert.ok(spans.every((span) => span.ended));
    assert.equal(telemetry.captureTelemetryContext().attributes['user.id'], 'user-b');
    reset();
  });
});
