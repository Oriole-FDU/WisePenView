import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ahooksStub, loadBusinessTelemetry, reactStub } from './hookBoundaries.mjs';

const flush = () => new Promise((resolve) => setImmediate(resolve));
const errors = (telemetry) =>
  telemetry.records.filter((record) => record.attributes['event.name'] === 'frontend.error');

async function loadDrawio(context) {
  const telemetry = await loadBusinessTelemetry(context, {
    entry: `
      export { useDrawioEditorSession } from '@/components/editors/drawio/hooks/useDrawioEditorSession';
      export { createDrawioSaveSession } from '@/components/editors/drawio/drawioSaveSession';
      export { hooks } from 'react'; export { listeners } from 'ahooks';
      export { notices } from '@heroui/react';
    `,
    stubs: {
      react: `${reactStub}
        const effects = [];
        const render = hooks.render;
        hooks.render = fn => { const result = render(fn); for (const effect of effects.splice(0)) effect(); return result; };
        hooks.dispose = () => { for (const slot of slots) slot?.cleanup?.(); };
        export function useEffect(fn, deps) {
          const slot = useRef({});
          if (!slot.current.deps || deps.some((value, index) => value !== slot.current.deps[index])) {
            effects.push(() => { slot.cleanup?.(); slot.cleanup = fn(); });
            slot.current.deps = deps;
          }
        }
        export const useSyncExternalStore = (_subscribe, snapshot) => snapshot();`,
      ahooks: `${ahooksStub}
        export const listeners = new Map();
        export function useMemoizedFn(fn) { const ref = useLatest(fn); const stable = useRef((...args) => ref.current(...args)); return stable.current; }
        export function useEventListener(type, listener) { listeners.set(type, listener); }`,
    },
  });
  telemetry.browser.cleanup(() => telemetry.hooks.dispose());
  const posted = [];
  const frame = { postMessage: (message) => posted.push(JSON.parse(message)) };
  const state = { persist: async () => {} };
  const options = {
    canEdit: true,
    drawioOrigin: 'https://drawio.example.test',
    initialVersion: 3,
    initialXml: '<original/>',
    resourceId: 'drawio-one',
    noteService: { saveDrawIoSnapshot: (...args) => state.persist(...args) },
  };
  let current;
  const render = (patch = {}) => {
    Object.assign(options, patch);
    current = telemetry.hooks.render(() => telemetry.useDrawioEditorSession(options));
    current.iframeRef.current = { contentWindow: frame };
    return current;
  };
  const message = (data, overrides = {}) =>
    telemetry.listeners.get('message')({
      origin: options.drawioOrigin,
      source: frame,
      data: JSON.stringify(data),
      ...overrides,
    });
  render();
  const ready = () => {
    message({ event: 'init' });
    message({ event: 'load' });
    return render();
  };
  return { ...telemetry, posted, state, render, message, ready, current: () => current };
}

test('Draw.io iframe 错误有/无 pending 都进入真 OTel，同错双入口不双报，原提示/错误保留', async (context) => {
  const telemetry = await loadDrawio(context);
  telemetry.message(
    { event: 'error', message: 'untrusted' },
    { origin: 'https://other.example.test' }
  );
  telemetry.message({ event: 'error', message: 'untrusted' }, { source: {} });
  assert.equal(errors(telemetry).length, 0);
  telemetry.message({ event: 'error', message: 'private iframe body' });
  assert.equal(errors(telemetry).length, 1);
  assert.ok(telemetry.render().error);
  assert.equal(telemetry.notices.at(-1).type, 'danger');
  assert.equal(errors(telemetry)[0].attributes['operation.name'], 'drawio-save');
  telemetry.flushTelemetryEvents(true);
  telemetry.ready();
  telemetry.message({ event: 'autosave', xml: '<private draft/>' });
  const current = telemetry.render();
  const pending = current.requestSave();
  assert.equal(current.requestSave(), pending);
  const rejected = assert.rejects(pending, (error) => error === telemetry.render().error);
  telemetry.message({ event: 'error', message: 'same iframe fault' });
  await rejected;
  assert.equal(errors(telemetry).length, 2);
  telemetry.flushTelemetryEvents(true);
  assert.equal(telemetry.records.length, 2);
  assert.equal(telemetry.render().saveState, 'failed');
  assert.ok(!JSON.stringify(telemetry.records).includes('private iframe body'));
  assert.ok(!JSON.stringify(telemetry.records).includes('<private draft/>'));
});

test('Draw.io 双保存入口捕捉原持久化错误，保留版本、dirty、成功重试；API 原异常不重报', async (context) => {
  const telemetry = await loadDrawio(context);
  telemetry.ready();
  const failure = new Error('non HTTP persist failure');
  telemetry.state.persist = async () => {
    throw failure;
  };
  telemetry.message({ event: 'save', xml: '<failed/>' });
  await flush();
  assert.equal(telemetry.render().saveState, 'failed');
  assert.equal(telemetry.current().error, failure);
  assert.equal(telemetry.current().currentVersion, 3);
  assert.equal(errors(telemetry).length, 1);
  telemetry.flushTelemetryEvents(true);
  const toolbarFailure = new Error('toolbar non HTTP persist failure');
  telemetry.state.persist = async () => {
    throw toolbarFailure;
  };
  const failed = telemetry.current().requestSave();
  const rejected = assert.rejects(failed, (error) => error === toolbarFailure);
  telemetry.message({ event: 'export', xml: '<failed/>' });
  await rejected;
  assert.equal(errors(telemetry).length, 2);
  telemetry.state.persist = async () => {};
  const retry = telemetry.render().requestSave();
  telemetry.message({ event: 'export', xml: '<failed/>' });
  await retry;
  assert.equal(telemetry.render().saveState, 'saved');
  assert.equal(telemetry.current().currentVersion, 4);
  assert.equal(errors(telemetry).length, 2);
});

test('Draw.io 工具栏保存失败和重试不改变 API 去重及修改后 dirty 判定', async (context) => {
  const telemetry = await loadDrawio(context);
  telemetry.ready();
  telemetry.message({ event: 'autosave', xml: '<changed/>' });
  const pendingPersist = Promise.withResolvers();
  telemetry.state.persist = () => pendingPersist.promise;
  const task = telemetry.render().requestSave();
  telemetry.message({ event: 'export', xml: '<changed/>' });
  telemetry.message({ event: 'autosave', xml: '<newer/>' });
  pendingPersist.resolve();
  await task;
  assert.equal(telemetry.render().saveState, 'dirty');
  assert.equal(telemetry.current().currentVersion, 4);
  telemetry.httpClient.defaults.adapter = async (config) => ({
    config,
    status: 200,
    headers: {},
    data: { code: 5421, msg: 'private API body', data: null },
  });
  telemetry.state.persist = () => telemetry.apiPost('/note/drawio/save', {});
  const failed = telemetry.current().requestSave();
  const rejected = assert.rejects(failed);
  telemetry.message({ event: 'export', xml: '<newer/>' });
  await rejected;
  assert.equal(telemetry.render().saveState, 'failed');
  assert.equal(telemetry.current().currentVersion, 4);
  assert.equal(errors(telemetry).length, 0);
  assert.equal(
    telemetry.records.filter(
      (record) => record.attributes['event.name'] === 'frontend.request_failure'
    ).length,
    1
  );
  telemetry.state.persist = async () => {};
  const retried = telemetry.current().requestSave();
  telemetry.message({ event: 'export', xml: '<newer/>' });
  await retried;
  assert.equal(telemetry.render().saveState, 'saved');
  assert.equal(telemetry.current().currentVersion, 5);
});

test('Draw.io 10 秒导出 timeout 可见，dispose/权限/未 ready 前置拒绝不报错', async (context) => {
  const telemetry = await loadDrawio(context);
  context.mock.timers.enable({ apis: ['setTimeout'] });
  await assert.rejects(telemetry.current().requestSave());
  assert.equal(errors(telemetry).length, 0);
  telemetry.ready();
  await assert.rejects(telemetry.render({ canEdit: false }).requestSave());
  assert.equal(errors(telemetry).length, 0);
  telemetry.render({ canEdit: true });
  telemetry.message({ event: 'autosave', xml: '<dirty/>' });
  const task = telemetry.render().requestSave();
  const rejected = assert.rejects(task);
  context.mock.timers.tick(10_000);
  await rejected;
  assert.equal(errors(telemetry).length, 1);
  assert.equal(telemetry.render().saveState, 'failed');
  const disposed = telemetry.current().requestSave();
  const disposal = assert.rejects(disposed);
  telemetry.hooks.dispose();
  await disposal;
  context.mock.timers.tick(10_000);
  assert.equal(errors(telemetry).length, 1);
});
