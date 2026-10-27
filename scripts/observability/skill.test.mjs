import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadSkill } from './hookBoundaries.mjs';

const routeState = {
  matches: [
    {
      route: { path: '/resources/:resourceType/:resourceId' },
      params: { resourceType: 'skill', resourceId: 'skill-one' },
    },
  ],
  location: { key: 'skill-one' },
  navigation: { state: 'idle' },
};

const errors = (telemetry) =>
  telemetry.records.filter((record) =>
    String(record.attributes['event.name']).startsWith('frontend.error')
  );

const createSnapshots = (count) =>
  Array.from({ length: count }, (_, index) => ({
    editorKey: `file-${index}`,
    revision: index + 1,
    file: { name: `${index}.md`, path: '/', size: index + 1 },
    content: `private file content-${index}`,
  }));

const renderController = (telemetry, snapshots, events) =>
  telemetry.hooks.render(() =>
    telemetry.useSkillSaveController({
      activeFileSnapshots: snapshots,
      fileSnapshots: snapshots,
      configSnapshot: null,
      skill: { resourceId: 'skill-one', draftVersion: 1 },
      canEdit: true,
      onConfigSaveFailed() {},
      onConfigSaveStarted() {},
      onConfigSaved() {},
      onFileSaveStarted() {},
      onFileSaveFailed() {
        events.outerFailures += 1;
      },
      onFilesSaved(_items, results) {
        events.results = results;
      },
      refreshSkill() {},
    })
  );

test('Skill 混合结果在真实结果边界捕获，API 原异常与重复对象不双报', async (context) => {
  const telemetry = await loadSkill(context);
  const stop = telemetry.installObservability({
    router: { state: routeState, subscribe: () => () => {} },
  });
  context.after(stop);
  const snapshots = createSnapshots(6);
  const ossError = new Error('OSS failed https://oss.example.test/file?signature=private');
  const apiError = new telemetry.WisePenError({
    code: 5421,
    source: 'api',
    serverMsg: 'private API body',
  });
  telemetry.markHttpExceptionObserved(apiError);
  const results = [
    { clientId: 'file-0', name: '0.md', path: '/' },
    { clientId: 'file-1', name: '1.md', path: '/', error: ossError },
    { clientId: 'file-2', name: '2.md', path: '/', error: ossError },
    { clientId: 'file-4', name: '4.md', path: '/', error: apiError },
    { clientId: 'file-5', name: '5.md', path: '/', error: apiError },
  ];
  telemetry.state.service = {
    uploadAssets: async () => results,
  };
  const events = { outerFailures: 0, results: null };

  await assert.rejects(renderController(telemetry, snapshots, events).saveCurrentFile(), {
    code: telemetry.FRONTEND_CLIENT_ERROR.SKILL_BATCH_SAVE_FAILED,
  });
  assert.equal(events.outerFailures, 0);
  assert.equal(events.results, results);
  assert.equal(errors(telemetry).length, 2);
  assert.ok(
    errors(telemetry).every(
      (record) =>
        record.attributes['operation.name'] === 'skill.save' &&
        record.attributes['error.detector'] === 'application-handled'
    )
  );
  assert.equal(
    errors(telemetry).find((record) => record.attributes['error.code'] !== undefined).attributes[
      'error.code'
    ],
    telemetry.FRONTEND_CLIENT_ERROR.INTERNAL_STATE
  );
  const serialized = JSON.stringify(telemetry.records);
  assert.ok(!serialized.includes('private file content'));
  assert.ok(!serialized.includes('signature=private'));
  assert.ok(!serialized.includes('private API body'));
  stop();
});

test('Skill 外层上传异常保留原对象并只捕获一次', async (context) => {
  const telemetry = await loadSkill(context);
  const stop = telemetry.installObservability({
    router: { state: routeState, subscribe: () => () => {} },
  });
  context.after(stop);
  const snapshots = createSnapshots(1);
  const failure = new Error('local upload preparation failure');
  telemetry.state.service = {
    uploadAssets: async () => {
      throw failure;
    },
  };
  const events = { outerFailures: 0, results: null };
  await assert.rejects(
    renderController(telemetry, snapshots, events).saveCurrentFile(),
    (error) => error === failure
  );
  assert.equal(events.outerFailures, 1);
  assert.equal(errors(telemetry).length, 1);
  assert.equal(errors(telemetry)[0].attributes['operation.name'], 'skill.save');
  stop();
});
