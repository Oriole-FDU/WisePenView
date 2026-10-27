import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadChat } from './hookBoundaries.mjs';

const routeState = {
  matches: [{ route: { path: '/chat/:sessionId' }, params: { sessionId: 'chat-one' } }],
  location: { key: 'chat-one' },
  navigation: { state: 'idle' },
};

const flush = () => new Promise((resolve) => setImmediate(resolve));
const errors = (telemetry) =>
  telemetry.records.filter((record) => record.attributes['event.name'] === 'frontend.error');

test('Chat 发送和流错误进入统一出口，同对象不双报且不包含对话内容', async (context) => {
  const telemetry = await loadChat(context);
  const stop = telemetry.installObservability({
    router: { state: routeState, subscribe: () => () => {} },
  });
  context.after(stop);

  const render = () =>
    telemetry.hooks.render(() =>
      telemetry.useChatTurnController({
        ensureSession: async () => 'chat-one',
        isNewlyCreatedSession: () => false,
        clearNewlyCreatedSession() {},
      })
    );
  const failure = new Error('send failed https://api.example.test/chat?token=private');
  let sendCalls = 0;
  telemetry.sdk.send = async () => {
    sendCalls += 1;
    throw failure;
  };
  assert.equal(
    await render().send('private dialogue', {
      model: { modelId: 'model', providerId: 'provider' },
    }),
    true
  );
  await flush();
  assert.equal(sendCalls, 1);
  assert.equal(errors(telemetry).length, 1, JSON.stringify(telemetry.records));
  assert.equal(errors(telemetry)[0].attributes['error.detector'], 'application-handled');
  assert.equal(errors(telemetry)[0].attributes['operation.name'], 'chat.send');
  assert.equal(errors(telemetry)[0].severityText, 'WARN');
  assert.equal(telemetry.state.finishCount, 1);
  telemetry.sdk.options.onError(failure);
  assert.equal(errors(telemetry).length, 1);

  telemetry.sdk.options.onError(new Error('stream failure'));
  assert.equal(errors(telemetry).at(-1).attributes['operation.name'], 'chat.stream');
  assert.ok(!JSON.stringify(telemetry.records).includes('private dialogue'));
  assert.ok(!JSON.stringify(telemetry.records).includes('token=private'));
  stop();
});

test('Chat 恢复和重连保留原异常、callback 与共享 Promise', async (context) => {
  const telemetry = await loadChat(context);
  const stop = telemetry.installObservability({
    router: { state: routeState, subscribe: () => () => {} },
  });
  context.after(stop);
  const callbacks = [];
  const options = {
    sessionId: 'chat-one',
    model: 'model',
    getActiveTurnId: async () => 'turn-one',
    onError: (error) => callbacks.push(error),
  };
  const chat = telemetry.hooks.render(() => telemetry.useChatSession(options));
  const recovered = new Error('recover failed');
  telemetry.sdk.send = async () => {
    throw recovered;
  };
  await assert.rejects(chat.recoverSession([]), (error) => error === recovered);
  assert.equal(errors(telemetry).at(-1).attributes['operation.name'], 'chat.recover');

  const resumed = new Error('resume failed');
  let resumeCount = 0;
  telemetry.sdk.resume = async () => {
    resumeCount += 1;
    throw resumed;
  };
  const first = chat.resumeSessionStream();
  assert.equal(chat.resumeSessionStream(), first);
  await first;
  assert.equal(resumeCount, 1);
  assert.equal(callbacks.at(-1), resumed);
  assert.equal(errors(telemetry).at(-1).attributes['operation.name'], 'chat.resume');
  stop();
});

test('Chat 主动取消不生成错误，已记录的 API 原异常不重复', async (context) => {
  const telemetry = await loadChat(context);
  const stop = telemetry.installObservability({
    router: { state: routeState, subscribe: () => () => {} },
  });
  context.after(stop);
  const chat = telemetry.hooks.render(() =>
    telemetry.useChatSession({
      sessionId: 'chat-one',
      model: 'model',
      getActiveTurnId: async () => 'turn-one',
    })
  );
  const before = errors(telemetry).length;
  for (const error of [
    Object.assign(new Error('cancel'), { name: 'AbortError' }),
    Object.assign(new Error('cancel'), { name: 'CanceledError' }),
    new telemetry.WisePenError({
      source: 'network',
      code: telemetry.FRONTEND_NETWORK_ERROR.CANCELED,
    }),
  ]) {
    telemetry.sdk.options.onError(error);
    telemetry.sdk.send = async () => {
      throw error;
    };
    await assert.rejects(chat.recoverSession([]));
  }
  assert.equal(errors(telemetry).length, before);
  stop();
});
