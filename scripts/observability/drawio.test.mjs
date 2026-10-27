import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadDrawio } from './hookBoundaries.mjs';

const routeState = {
  matches: [
    {
      route: { path: '/resources/:resourceType/:resourceId' },
      params: { resourceType: 'drawio', resourceId: 'drawio-one' },
    },
  ],
  location: { key: 'drawio-one' },
  navigation: { state: 'idle' },
};

const errors = (telemetry) =>
  telemetry.records.filter((record) =>
    String(record.attributes['event.name']).startsWith('frontend.error')
  );

test('Draw.io iframe、导出和持久化故障统一捕获且保留原状态', async (context) => {
  const telemetry = await loadDrawio(context);
  const stop = telemetry.installObservability({
    router: { state: routeState, subscribe: () => () => {} },
  });
  context.after(stop);
  let persist = async () => {};
  const posted = [];
  const frame = { postMessage: (message) => posted.push(JSON.parse(message)) };
  const options = {
    canEdit: true,
    drawioOrigin: 'https://drawio.example.test',
    initialVersion: 3,
    initialXml: '<original/>',
    resourceId: 'drawio-one',
    noteService: {
      saveDrawIoSnapshot: (...args) => persist(...args),
    },
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
  const ready = () => {
    message({ event: 'init' });
    message({ event: 'load' });
    return render();
  };

  render();
  message({ event: 'error', message: 'untrusted' }, { origin: 'https://other.example.test' });
  message({ event: 'error', message: 'untrusted' }, { source: {} });
  assert.equal(errors(telemetry).length, 0);

  message({ event: 'error', message: 'private iframe body https://example.test?token=secret' });
  assert.equal(errors(telemetry).length, 1);
  assert.equal(errors(telemetry)[0].attributes['operation.name'], 'drawio.save');
  assert.equal(errors(telemetry)[0].attributes['error.detector'], 'application-handled');
  assert.ok(render().error);
  assert.equal(telemetry.notices.at(-1).type, 'danger');

  ready();
  message({ event: 'autosave', xml: '<private draft/>' });
  const pending = render().requestSave();
  const rejected = assert.rejects(pending);
  message({ event: 'error', message: 'same iframe fault' });
  await rejected;
  assert.equal(errors(telemetry).length, 1);
  assert.equal(render().saveState, 'failed');

  message({ event: 'autosave', xml: '<changed/>' });
  const persistenceFailure = new Error('private persistence failure');
  persist = async () => {
    throw persistenceFailure;
  };
  const savePromise = render().requestSave();
  const failed = assert.rejects(savePromise, (error) => error === persistenceFailure);
  message({ event: 'export', xml: '<changed/>' });
  await failed;
  assert.equal(errors(telemetry).length, 2);
  assert.equal(render().saveState, 'failed');
  assert.ok(!JSON.stringify(telemetry.records).includes('private iframe body'));
  assert.ok(!JSON.stringify(telemetry.records).includes('<private draft/>'));
  assert.equal(typeof current.requestSave, 'function');

  stop();
  assert.equal(errors(telemetry).at(-1).attributes['event.name'], 'frontend.error_summary');
  assert.equal(errors(telemetry).at(-1).attributes['error.occurrence_count'], 1);
  assert.equal(errors(telemetry).at(-1).attributes['error.total_count'], 2);
});
