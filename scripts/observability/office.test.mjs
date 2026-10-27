import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadOffice } from './hookBoundaries.mjs';

const routeState = {
  matches: [
    {
      route: { path: '/resources/:resourceType/:resourceId' },
      params: { resourceType: 'document', resourceId: 'office-one' },
    },
  ],
  location: { key: 'office-one' },
  navigation: { state: 'idle' },
};

const errors = (telemetry) =>
  telemetry.records.filter((record) =>
    String(record.attributes['event.name']).startsWith('frontend.error')
  );

test('Office 明确 SDK callbacks 统一捕获，同故障归并且不改变编辑状态', async (context) => {
  const telemetry = await loadOffice(context);
  const stop = telemetry.installObservability({
    router: { state: routeState, subscribe: () => () => {} },
  });
  context.after(stop);
  const render = () =>
    telemetry.hooks.render(() => telemetry.OfficeEditor({ resourceId: 'office-one' }));

  render();
  telemetry.sdk.props.events_onDocumentReady();
  telemetry.sdk.props.events_onDocumentStateChange({ data: true });
  render();
  assert.equal(telemetry.officeState.snapshot.hasUnsavedChanges, true);
  assert.equal(telemetry.officeState.snapshot.pendingWork, true);
  assert.equal(errors(telemetry).length, 0);

  const sdkEvent = {
    data: { errorCode: 99, errorDescription: 'private SDK document body' },
  };
  telemetry.sdk.props.events_onError(sdkEvent);
  render();
  assert.equal(telemetry.officeState.snapshot.error.cause, sdkEvent);
  assert.equal(telemetry.officeState.snapshot.hasUnsavedChanges, true);
  assert.equal(errors(telemetry).length, 1);
  assert.equal(errors(telemetry)[0].attributes['operation.name'], 'office.sdk');
  assert.equal(errors(telemetry)[0].attributes['error.detector'], 'application-handled');
  assert.equal(errors(telemetry)[0].severityText, 'WARN');

  telemetry.sdk.props.onLoadComponentError(42, 'private SDK description');
  render();
  assert.equal(telemetry.officeState.snapshot.error.meta.errorCode, 42);
  assert.equal(errors(telemetry).length, 1);
  assert.ok(!JSON.stringify(telemetry.records).includes('private SDK'));
  assert.ok(!JSON.stringify(telemetry.records).includes('private document'));
  assert.equal(typeof telemetry.officeState.exit, 'function');

  stop();
  assert.equal(
    errors(telemetry).at(-1)?.attributes['event.name'],
    'frontend.error_summary',
    JSON.stringify(telemetry.records)
  );
  assert.equal(errors(telemetry).at(-1).attributes['error.occurrence_count'], 1);
});
