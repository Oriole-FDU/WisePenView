import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadBusinessTelemetry } from './hookBoundaries.mjs';

async function loadChat(context) {
  return loadBusinessTelemetry(context, {
    entry: `
      export { useChatSession } from '@/domains/Chat/session/useChatSession';
      export { useChatTurnController } from '@/components/business/Chat/_controllers/useChatTurnController';
      export { hooks } from 'react';
      export { sdk } from '@ai-sdk/react';
      export { state } from 'controlled-state';
      export { notices } from '@heroui/react';
    `,
    stubs: {
      '@ai-sdk/react': `
        export const sdk = { options: null, send: async () => {}, resume: async () => {} };
        const chat = { messages: [], status: 'ready', setMessages() {}, stop() {},
          sendMessage: (...args) => sdk.send(...args), resumeStream: (...args) => sdk.resume(...args) };
        export function useChat(options) { sdk.options = options; return chat; }
      `,
      ai: `export class DefaultChatTransport { constructor(options) { this.options = options; } }
        export const isTextUIPart = part => part.type === 'text';
        export const isReasoningUIPart = part => part.type === 'reasoning';
        export const isToolUIPart = () => false;`,
      'controlled-state': `export const state = { route: { sessionId: 'chat-one', locationKey: 'one' }, getActive: async () => 'turn-one', finishCount: 0 };`,
      '@/domains': `import { state } from 'controlled-state'; export const useChatService = () => ({ getActiveTurnId: (...args) => state.getActive(...args), cancelTurn: async () => {} });`,
      '@/domains/Chat': `export { useChatSession } from '@/domains/Chat/session/useChatSession';`,
      '@/hooks/useChatSessionRoute': `import { state } from 'controlled-state'; export const useChatSessionRoute = () => state.route;`,
      '@/layouts/App/_context': `export const useAppAuth = () => ({ isAuthenticated: true, requireLogin() {} });`,
      '@/frontendState': `import { state } from 'controlled-state'; export const readFrontendStates = () => ({ states: [], finishSend() { state.finishCount++; } });`,
      './useChatTurnHistory': `export const useChatTurnHistory = () => ({});`,
      './useChatToolApproval': `export const useChatToolApproval = () => ({});`,
    },
  });
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const errors = (telemetry) =>
  telemetry.records.filter((record) => record.attributes['event.name'] === 'frontend.error');

test('Chat 真发送 catch 和 SDK onError 到真实 OTel；回调、提示、成功结果及同对象去重保持', async (context) => {
  const telemetry = await loadChat(context);
  const render = () =>
    telemetry.hooks.render(() =>
      telemetry.useChatTurnController({
        ensureSession: async () => 'chat-one',
        isNewlyCreatedSession: () => false,
        clearNewlyCreatedSession() {},
      })
    );
  const failure = new Error('send failed https://example.test/x?token=private');
  failure.stack = 'Error: send failed\n at send (https://app.example.test/assets/chat.js:1:2)';
  telemetry.sdk.send = async () => {
    throw failure;
  };
  assert.equal(
    await render().send('private dialogue', {
      model: { modelId: 'model', providerId: 'provider' },
    }),
    true
  );
  await flush();
  assert.equal(errors(telemetry).length, 1);
  assert.equal(errors(telemetry)[0].attributes['operation.name'], 'chat-send');
  assert.equal(errors(telemetry)[0].attributes['error.origin'], 'handled');
  assert.equal(telemetry.state.finishCount, 1);
  assert.equal(telemetry.notices.at(-1).type, 'danger');
  telemetry.sdk.options.onError(failure);
  assert.equal(errors(telemetry).length, 1);
  const streamed = new Error('stream failure');
  telemetry.sdk.options.onError(streamed);
  assert.equal(errors(telemetry).at(-1).attributes['operation.name'], 'chat-stream');
  assert.ok(!JSON.stringify(telemetry.records).includes('private dialogue'));
  assert.ok(!JSON.stringify(telemetry.records).includes('token=private'));
  telemetry.sdk.send = async () => {};
  assert.equal(await render().send('success', { model: { modelId: 'model' } }), true);
  await flush();
  assert.equal(errors(telemetry).length, 2);
});

test('Chat 恢复和重连接线保留原异常及 callback；取消和已记录 API 错误不重报', async (context) => {
  const telemetry = await loadChat(context);
  const callbacks = [];
  const options = {
    sessionId: 'chat-one',
    getActiveTurnId: async () => 'turn-one',
    onError: (error) => callbacks.push(error),
  };
  const chat = telemetry.hooks.render(() => telemetry.useChatSession(options));
  const recovered = new Error('recover failed');
  telemetry.sdk.send = async () => {
    throw recovered;
  };
  await assert.rejects(chat.recoverSession([]), (error) => error === recovered);
  assert.equal(errors(telemetry).at(-1).attributes['operation.name'], 'chat-recover');
  const resumed = new Error('resume failed');
  let resumeCount = 0;
  telemetry.sdk.resume = async () => {
    resumeCount++;
    throw resumed;
  };
  const first = chat.resumeSessionStream();
  assert.equal(chat.resumeSessionStream(), first);
  await first;
  await chat.resumeSessionStream();
  assert.equal(resumeCount, 1);
  assert.equal(callbacks.at(-1), resumed);
  assert.equal(errors(telemetry).at(-1).attributes['operation.name'], 'chat-resume');
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
    assert.equal(callbacks.at(-1), error);
    telemetry.sdk.send = async () => {
      throw error;
    };
    await assert.rejects(chat.recoverSession([]));
  }
  assert.equal(errors(telemetry).length, before);
  telemetry.httpClient.defaults.adapter = async (config) => ({
    config,
    status: 200,
    headers: {},
    data: { code: 5421, msg: 'private server body', data: null },
  });
  let apiError;
  await telemetry.apiGet('/chat/active-turn').catch((error) => {
    apiError = error;
  });
  assert.ok(apiError);
  assert.equal(telemetry.records.at(-1).severityText, 'WARN');
  telemetry.sdk.options.onError(apiError);
  telemetry.sdk.send = async () => {
    throw apiError;
  };
  await assert.rejects(chat.recoverSession([]), (error) => error === apiError);
  assert.equal(errors(telemetry).length, before);
  const next = telemetry.hooks.render(() =>
    telemetry.useChatSession({
      ...options,
      sessionId: 'chat-two',
      getActiveTurnId: async () => {
        throw apiError;
      },
    })
  );
  await next.resumeSessionStream();
  assert.equal(errors(telemetry).length, before);
  assert.equal(
    telemetry.records.filter(
      (record) => record.attributes['event.name'] === 'frontend.request_failure'
    ).length,
    1
  );
});

test('Chat 会话切换后的迟到恢复失败不会改变新会话、回调或遥测', async (context) => {
  const telemetry = await loadChat(context);
  const pending = Promise.withResolvers();
  const callbacks = [];
  const initial = {
    sessionId: 'old',
    getActiveTurnId: () => pending.promise,
    onError: (error) => callbacks.push(error),
  };
  const chat = telemetry.hooks.render(() => telemetry.useChatSession(initial));
  const request = chat.resumeSessionStream();
  telemetry.hooks.render(() => telemetry.useChatSession({ ...initial, sessionId: 'new' }));
  pending.reject(new Error('late old failure'));
  await request;
  assert.equal(callbacks.length, 0);
  assert.equal(errors(telemetry).length, 0);
});

test('handled 扩展保留字符串 ID 和原双参数 reporter callback 契约', async (context) => {
  const telemetry = await loadChat(context);
  const error = new Error('contract');
  let captured;
  const stop = telemetry.configureErrorReporter((report, original) => {
    captured = { report, original };
  });
  context.after(stop);
  const id = telemetry.reportError(error, { origin: 'handled', operation: 'chat-send' });
  assert.equal(typeof id, 'string');
  assert.equal(captured.report.id, id);
  assert.equal(captured.original, error);
  assert.equal(captured.report.operation, 'chat-send');
});
