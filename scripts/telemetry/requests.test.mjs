import assert from 'node:assert/strict';
import { test } from 'node:test';

import { installBrowser, loadTelemetry } from './harness.mjs';

const telemetry = await loadTelemetry();

test('完整请求链路保留异常语义、身份、分类与去重', async (context) => {
  const browser = installBrowser(context);
  const stop = telemetry.installOtelErrorReporter();
  context.after(stop);
  const { httpClient, records, spans } = telemetry;
  const { AxiosError } = await import('axios');
  const adapter = (handler) => {
    httpClient.defaults.adapter = async (config) => handler(config);
  };
  const response = (config, data, status = 200) => ({
    config,
    data,
    status,
    statusText: '',
    headers: { 'x-request-id': 'request-123' },
  });
  const identify = (id) =>
    telemetry.identifyTelemetryUser(id, telemetry.authSessionCoordinator.getSessionVersion());
  const reset = () => {
    telemetry.flushTelemetryEvents(true);
    records.length = 0;
    spans.length = 0;
  };
  identify('user-a');
  reset();

  await context.test(
    '成功请求只进入近期事件，不生成成功日志；完整请求参数和正文不采集',
    async () => {
      adapter((config) => response(config, { code: 200, msg: 'ok', data: 'result' }));
      assert.equal(
        await telemetry.apiPost('/success?token=secret', { text: 'secret body' }),
        'result'
      );
      assert.equal(records.length, 0);
      const snapshot = telemetry.captureTelemetryContext();
      assert.equal(snapshot.breadcrumbs.at(-1).attributes['api.endpoint'], '/success');
      assert.ok(!JSON.stringify(snapshot).includes('secret'));
    }
  );

  await context.test('全局异常附带现场；重复异常形成摘要并保持准确次数', () => {
    reset();
    for (let i = 0; i < 5; i++) {
      telemetry.reportError(new Error('repeated error'), { origin: 'unhandled-rejection' });
    }
    assert.equal(records.length, 1);
    assert.equal(records[0].attributes['user.id'], 'user-a');
    assert.equal(records[0].attributes['browser.name'], 'Chrome');
    assert.ok(records[0].attributes['telemetry.breadcrumbs']);
    telemetry.flushTelemetryEvents(true);
    assert.equal(records.length, 2);
    assert.equal(records[1].attributes['event.name'], 'frontend.error_summary');
    assert.equal(records[1].attributes['error.occurrence_count'], 4);
    reset();
  });

  await context.test('业务失败和无效响应契约均可见，原始异常继续抛给调用方', async () => {
    adapter((config) =>
      response(config, { code: 49901, msg: 'me@example.test secret body', data: null })
    );
    let businessError;
    await assert.rejects(telemetry.apiGet('/business'), (error) => {
      businessError = error;
      return error.source === 'api' && error.code === 49901;
    });
    assert.equal(records.at(-1).attributes['error.kind'], 'business');
    assert.equal(records.at(-1).attributes['api.business_code'], 49901);
    assert.equal(records.at(-1).attributes['http.response.status_code'], 200);
    assert.equal(records.at(-1).attributes['wisepen.request_id'], 'request-123');
    assert.ok(!JSON.stringify(records).includes('secret body'));
    const count = records.length;
    telemetry.reportError(businessError, { origin: 'unhandled-rejection' });
    assert.equal(records.length, count);
    adapter((config) => response(config, { unexpected: 'shape' }));
    await assert.rejects(telemetry.apiGet('/invalid'), (error) => error.source === 'http');
    assert.equal(records.at(-1).attributes['error.kind'], 'contract');
    assert.equal(records.at(-1).severityText, 'ERROR');
    reset();
  });

  await context.test(
    'HTTP 重试只记录最终失败，4xx 及网络超时均有分类，取消不产生错误',
    async () => {
      let attempts = 0;
      adapter((config) => {
        attempts++;
        throw new AxiosError(
          'server error',
          'ERR_BAD_RESPONSE',
          config,
          {},
          response(config, { code: 50001, msg: 'private message' }, 503)
        );
      });
      await assert.rejects(telemetry.apiGet('/retry', { retryDelayMs: 0 }));
      assert.equal(attempts, 3);
      assert.equal(records.length, 1);
      assert.equal(records[0].attributes['http.request.resend_count'], 2);
      assert.equal(records[0].attributes['http.response.status_code'], 503);
      reset();
      for (const [path, code, status, kind, severity] of [
        ['/missing', 'ERR_BAD_REQUEST', 404, 'http', 'WARN'],
        ['/offline', 'ERR_NETWORK', undefined, 'network', 'ERROR'],
        ['/timeout', 'ECONNABORTED', undefined, 'timeout', 'ERROR'],
      ]) {
        adapter((config) => {
          throw new AxiosError(
            'request error',
            code,
            config,
            {},
            status ? response(config, {}, status) : undefined
          );
        });
        await assert.rejects(telemetry.apiGet(path, { retry: false }));
        assert.equal(records.at(-1).attributes['error.kind'], kind);
        assert.equal(records.at(-1).severityText, severity);
      }
      reset();
      const controller = new AbortController();
      controller.abort();
      await assert.rejects(telemetry.apiGet('/cancel', { signal: controller.signal }));
      assert.equal(records.length, 0);
      reset();
    }
  );

  await context.test('正文接口和 DELETE、PUT 保持现有请求行为', async () => {
    const methods = [];
    adapter((config) => {
      methods.push(config.method);
      return response(
        config,
        config.responseType === 'text' ? 'plain text' : { code: 200, msg: 'ok', data: 42 }
      );
    });
    assert.equal(await telemetry.apiGetText('/text'), 'plain text');
    assert.equal(
      await telemetry.apiGetText('/text', { transformResponse: [() => 'custom text'] }),
      'custom text'
    );
    assert.equal(await telemetry.apiPut('/update', { value: 1 }), 42);
    assert.equal(await telemetry.apiDelete('/delete'), 42);
    assert.deepEqual(methods, ['get', 'get', 'put', 'delete']);
  });

  await context.test('账号 A 的请求在切到 B 后失败，仍归属 A，且不污染 B 的近期事件', async () => {
    reset();
    let rejectRequest;
    const started = Promise.withResolvers();
    adapter(
      (config) =>
        new Promise((_resolve, reject) => {
          rejectRequest = () => reject(new AxiosError('network error', 'ERR_NETWORK', config));
          started.resolve();
        })
    );
    const oldSession = telemetry.captureTelemetryContext().attributes['session.id'];
    const pending = telemetry.apiGet('/old-account', { retry: false });
    await started.promise;
    telemetry.authSessionCoordinator.publish('login');
    telemetry.resetTelemetryIdentity('login');
    identify('user-b');
    reset();
    browser.document.visibilityState = 'hidden';
    rejectRequest();
    await assert.rejects(pending);
    const failure = records.find((record) => record.attributes['api.endpoint'] === '/old-account');
    assert.equal(failure.attributes['user.id'], 'user-a');
    assert.equal(failure.attributes['session.id'], oldSession);
    assert.equal(failure.attributes['page.visibility'], 'hidden');
    assert.equal(telemetry.captureTelemetryContext().attributes['user.id'], 'user-b');
    assert.ok(
      !JSON.stringify(telemetry.captureTelemetryContext().breadcrumbs).includes('/old-account')
    );
    assert.ok(spans.every((span) => span.ended));
    reset();
  });
});
