import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadBusinessTelemetry } from './hookBoundaries.mjs';

async function loadSkill(context, count = 2) {
  const telemetry = await loadBusinessTelemetry(context, {
    entry: `
      export { useSkillSaveController } from '@/components/editors/skill/controllers/useSkillSaveController';
      export { createSkillServices } from '@/domains/Skill/service/SkillServices.impl';
      export * from '@/components/editors/skill/models/workspaceDraft';
      export { getErrorReportId } from '@/utils/error/reportError';
      export { hooks } from 'react';
      export { state } from 'controlled-state';
      export { notices } from '@heroui/react';
    `,
    stubs: {
      'controlled-state': `export const state = { service: null, initCalls: [], putCalls: [], canceled: [], init: async () => ({}), put: async () => {} };`,
      '@/domains': `import { state } from 'controlled-state'; export const useSkillService = () => state.service;`,
      '@domain-apis': `
        import { state } from 'controlled-state';
        export const SkillApi = {
          initUploadSkillAssets: params => { state.initCalls.push(params); return state.init(params); },
          cancelUploadSkillAssets: async params => { state.canceled.push(params); },
          changeSkillInfo: params => state.changeInfo(params),
        };
        export const putOssPresignedUrl = params => { state.putCalls.push(params); return state.put(params); };
        export const createOssClient = () => { throw new Error('unexpected OSS read'); };
      `,
      'ahooks/es/useRequest': `
        import { useState } from 'react';
        export default function useRequest(service, options) {
          const [loading, setLoading] = useState(false);
          return { loading, runAsync: async (...params) => {
            setLoading(true);
            try { const data = await service(...params); options.onSuccess?.(data, params); return data; }
            catch (error) { options.onError?.(error, params); throw error; }
            finally { setLoading(false); }
          } };
        }
      `,
      'ahooks/es/usePagination': `export default () => { throw new Error('unexpected pagination'); };`,
      'ahooks/es/useInfiniteScroll': `export default () => { throw new Error('unexpected infinite scroll'); };`,
    },
  });
  const skill = {
    resourceId: 'skill-one',
    draftVersion: 2,
    version: 1,
    status: 'DRAFT',
    skillName: 'skill',
    description: 'description',
    files: Array.from({ length: count }, (_, index) => ({
      id: `file-${index}`,
      name: `${index}.md`,
      path: '/',
      kind: 'file',
      content: `baseline-${index}`,
    })),
  };
  let workspace = telemetry.createInitialSkillWorkspaceState(skill);
  workspace.fileDrafts = Object.fromEntries(
    skill.files.map((file, index) => {
      const editorKey = workspace.fileKeys[file.id];
      return [
        editorKey,
        {
          editorKey,
          fileId: file.id,
          revision: index + 1,
          content: `private file content-${index}`,
        },
      ];
    })
  );
  const deliveries = [];
  let failures = 0;
  telemetry.state.service = telemetry.createSkillServices({ resourceService: {} });
  const tickets = ({ assets }) => ({
    assetUploadTickets: assets.map((asset) => ({
      assetId: `saved-${asset.name}`,
      objectKey: `private/${asset.name}`,
      putUrl: `https://oss.example.test/${asset.name}?signature=private`,
      callbackHeader: 'private callback',
    })),
  });
  telemetry.state.init = async (params) => tickets(params);
  telemetry.state.put = async ({ onProgress }) => onProgress(50);
  const render = (overrides = {}) => {
    const snapshots = telemetry.buildSkillFileSaveSnapshots(workspace.files, workspace.fileDrafts);
    return telemetry.hooks.render(() =>
      telemetry.useSkillSaveController({
        activeFileSnapshots: snapshots,
        fileSnapshots: snapshots,
        configSnapshot: null,
        skill,
        canEdit: true,
        onConfigSaveFailed() {},
        onConfigSaveStarted() {},
        onConfigSaved() {},
        onFileSaveStarted(items) {
          for (const item of items) workspace.savingFileRevisions[item.editorKey] = item.revision;
        },
        onFileSaveFailed(items) {
          failures++;
          workspace = telemetry.finishFailedSkillFileSave(workspace, items);
        },
        onFilesSaved(items, results) {
          deliveries.push({ snapshots: items, results });
          workspace = telemetry.applySavedSkillFiles(workspace, items, results);
        },
        refreshSkill() {},
        ...overrides,
      })
    );
  };
  return {
    ...telemetry,
    skill,
    render,
    tickets,
    deliveries,
    workspace: () => workspace,
    failures: () => failures,
  };
}

const errors = (telemetry) =>
  telemetry.records.filter((record) => record.attributes['event.name'] === 'frontend.error');
const requests = (telemetry) =>
  telemetry.records.filter(
    (record) => record.attributes['event.name'] === 'frontend.request_failure'
  );
const turn = () => new Promise((resolve) => setImmediate(resolve));

function rejectApi(telemetry) {
  telemetry.httpClient.defaults.adapter = async (config) => ({
    config,
    status: 200,
    headers: {},
    data: { code: 5421, msg: 'private API response', data: null },
  });
  return telemetry.apiPost('/skill/upload/init');
}

test('Skill 真 controller/service 混合结果进入真 OTel，API 不重报、成功结果和失败草稿保留', async (context) => {
  const telemetry = await loadSkill(context, 14);
  const ossError = new Error('OSS failed https://oss.example.test/file?signature=private');
  let apiError;
  telemetry.state.init = async (params) => {
    if (params.assets[0].name === '12.md') {
      try {
        await rejectApi(telemetry);
      } catch (error) {
        apiError = error;
        throw error;
      }
    }
    const result = telemetry.tickets(params);
    result.assetUploadTickets[3] = {};
    return result;
  };
  telemetry.state.put = async ({ putUrl, onProgress }) => {
    onProgress(40);
    if (/\/(1|2)\.md\?/.test(putUrl)) throw ossError;
  };
  await assert.rejects(telemetry.render().saveAll(), {
    code: telemetry.FRONTEND_CLIENT_ERROR.SKILL_BATCH_SAVE_FAILED,
  });
  const { results, snapshots } = telemetry.deliveries[0];
  assert.deepEqual(
    results.map((result) => result.clientId),
    snapshots.map((snapshot) => snapshot.editorKey)
  );
  assert.equal(results[1].error, ossError);
  assert.equal(results[2].error, ossError);
  assert.equal(results[12].error, apiError);
  assert.equal(results[13].error, apiError);
  assert.equal(requests(telemetry).length, 1);
  assert.equal(requests(telemetry)[0].severityText, 'WARN');
  assert.equal(errors(telemetry).length, 2);
  assert.equal(errors(telemetry)[0].attributes['error.id'], telemetry.getErrorReportId(ossError));
  assert.equal(
    errors(telemetry)[1].attributes['error.code'],
    telemetry.FRONTEND_CLIENT_ERROR.SKILL_UPLOAD_ASSET_ID_MISSING
  );
  assert.ok(
    errors(telemetry).every((record) => record.attributes['operation.name'] === 'skill-save')
  );
  assert.ok(errors(telemetry).every((record) => record.attributes['error.origin'] === 'handled'));
  assert.equal(telemetry.failures(), 0);
  assert.equal(telemetry.notices.at(-1).type, 'danger');
  assert.equal(telemetry.state.canceled.length, 2);
  const failedKeys = [1, 2, 3, 12, 13].map((index) => snapshots[index].editorKey);
  assert.deepEqual(Object.keys(telemetry.workspace().fileDrafts), failedKeys);
  assert.deepEqual(telemetry.workspace().savingFileRevisions, {});
  assert.equal(telemetry.workspace().files[0].content, snapshots[0].content);
  const queue = telemetry.render().visibleQueueItems;
  assert.deepEqual(
    queue.map((item) => item.id),
    failedKeys
  );
  assert.ok(queue.every((item) => item.phase === 'failed'));
  const recorded = JSON.stringify(telemetry.records);
  for (const value of [
    'private file content',
    'signature=private',
    'private callback',
    'private API response',
  ])
    assert.ok(!recorded.includes(value));
  telemetry.state.init = async (params) => telemetry.tickets(params);
  telemetry.state.put = async ({ onProgress }) => onProgress(60);
  await telemetry.render().saveAll({ showToast: false });
  assert.deepEqual(telemetry.workspace().fileDrafts, {});
  assert.deepEqual(telemetry.render().visibleQueueItems, []);
  assert.equal(telemetry.deliveries[1].results.length, 5);
  assert.equal(errors(telemetry).length, 2);
  assert.equal(requests(telemetry).length, 1);
});

test('Skill API-only 结果和外层 catch 交回原异常；不发送批次汇总错误', async (context) => {
  const telemetry = await loadSkill(context);
  telemetry.state.init = () => rejectApi(telemetry);
  await assert.rejects(telemetry.render().saveCurrentFile(), {
    code: telemetry.FRONTEND_CLIENT_ERROR.SKILL_BATCH_SAVE_FAILED,
  });
  const original = telemetry.deliveries[0].results[0].error;
  assert.equal(telemetry.deliveries[0].results[1].error, original);
  assert.equal(requests(telemetry).length, 1);
  assert.equal(errors(telemetry).length, 0);
  telemetry.state.service.uploadAssets = async () => {
    throw original;
  };
  await assert.rejects(telemetry.render().saveCurrentFile(), (error) => error === original);
  assert.equal(telemetry.failures(), 1);
  assert.equal(errors(telemetry).length, 0);
  const failure = new Error('local upload preparation failure');
  telemetry.state.service.uploadAssets = async () => {
    throw failure;
  };
  await assert.rejects(telemetry.render().saveCurrentFile(), (error) => error === failure);
  assert.equal(telemetry.failures(), 2);
  assert.equal(errors(telemetry).length, 1);
  assert.equal(errors(telemetry)[0].attributes['error.id'], telemetry.getErrorReportId(failure));
  assert.equal(Object.keys(telemetry.workspace().fileDrafts).length, 2);
});

test('Skill 缺结果产生明确本地错误，OSS-only 保留原错误，均不改变成功结果', async (context) => {
  const telemetry = await loadSkill(context);
  const upload = telemetry.state.service.uploadAssets;
  telemetry.state.service.uploadAssets = async (...args) => (await upload(...args)).slice(0, 1);
  await assert.rejects(telemetry.render().saveCurrentFile(), {
    code: telemetry.FRONTEND_CLIENT_ERROR.SKILL_BATCH_SAVE_FAILED,
  });
  assert.equal(errors(telemetry).length, 1);
  assert.equal(
    errors(telemetry)[0].attributes['error.code'],
    telemetry.FRONTEND_CLIENT_ERROR.INTERNAL_STATE
  );
  assert.equal(telemetry.workspace().files[0].content, 'private file content-0');
  assert.equal(Object.keys(telemetry.workspace().fileDrafts).length, 1);
  telemetry.state.service.uploadAssets = upload;
  const ossError = new Error('OSS-only failure');
  telemetry.state.put = async () => {
    throw ossError;
  };
  await assert.rejects(telemetry.render().saveCurrentFile(), {
    code: telemetry.FRONTEND_CLIENT_ERROR.SKILL_BATCH_SAVE_FAILED,
  });
  assert.equal(telemetry.deliveries[1].results[0].error, ossError);
  assert.equal(errors(telemetry).length, 2);
  assert.equal(errors(telemetry)[1].attributes['error.id'], telemetry.getErrorReportId(ossError));
  assert.equal(Object.keys(telemetry.workspace().fileDrafts).length, 1);
});

test('Skill 保存共享进行中请求、进度和新 revision；权限/空保存及配置不新增非 HTTP 上报', async (context) => {
  const telemetry = await loadSkill(context, 1);
  await telemetry.render({ canEdit: false }).saveAll();
  await telemetry.render({ fileSnapshots: [], activeFileSnapshots: [] }).saveCurrentFile();
  assert.equal(telemetry.state.initCalls.length, 0);
  const pending = Promise.withResolvers();
  telemetry.state.put = async ({ onProgress }) => {
    onProgress(45);
    await pending.promise;
  };
  const first = telemetry.render().saveCurrentFile();
  await turn();
  assert.equal(telemetry.render().visibleQueueItems[0].progress, 45);
  assert.equal(telemetry.render().fileSaveLoading, true);
  const second = telemetry.render().saveCurrentFile();
  assert.equal(telemetry.state.initCalls.length, 1);
  const draft = Object.values(telemetry.workspace().fileDrafts)[0];
  draft.revision++;
  draft.content = 'private new revision';
  pending.resolve();
  await Promise.all([first, second]);
  assert.equal(telemetry.deliveries.length, 1);
  assert.equal(telemetry.workspace().files[0].content, 'private file content-0');
  assert.equal(telemetry.workspace().fileDrafts[draft.editorKey].content, 'private new revision');
  assert.equal(telemetry.render().visibleQueueItems[0].phase, 'pending');
  telemetry.state.put = async () => {};
  await telemetry.render().saveCurrentFile();
  assert.equal(telemetry.workspace().files[0].content, 'private new revision');
  assert.equal(Object.keys(telemetry.workspace().fileDrafts).length, 0);
  telemetry.state.changeInfo = () => rejectApi(telemetry);
  let configFailures = 0;
  await assert.rejects(
    telemetry
      .render({
        configSnapshot: { revision: 1, name: 'skill', description: 'description' },
        onConfigSaveFailed: () => {
          configFailures++;
        },
      })
      .saveConfig()
  );
  assert.equal(configFailures, 1);
  assert.equal(requests(telemetry).length, 1);
  assert.equal(errors(telemetry).length, 0);
});
