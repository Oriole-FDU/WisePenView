import assert from 'node:assert/strict';
import { Blob, File } from 'node:buffer';
import { test } from 'node:test';

import { loadSourceModule } from './helpers/load-source.mjs';

const state = {
  canceled: [],
  deleted: [],
  failedBody: undefined,
  failCancel: false,
  flash: false,
  putError: undefined,
  bodies: [],
};

function reset() {
  state.canceled.length = 0;
  state.deleted.length = 0;
  state.failedBody = undefined;
  state.failCancel = false;
  state.flash = false;
  state.putError = undefined;
  state.bodies.length = 0;
}

const api = {
  async initUploadSkillAssets({ assets }) {
    return {
      assetUploadTickets: assets.map((asset, index) => ({
        assetId: `existing-${index}`,
        objectKey: `candidate-${index}`,
        name: asset.name,
        path: asset.path,
        ...(!state.flash && { putUrl: `candidate-${index}`, callbackHeader: 'test' }),
        flashUploaded: state.flash,
      })),
    };
  },
  async cancelUploadSkillAssets(request) {
    state.canceled.push(request);
    if (state.failCancel) throw new Error('cancel failed');
  },
  async deleteSkillAssets(request) {
    state.deleted.push(request);
  },
};

globalThis.__assetUploadTest = {
  api,
  agentApi: {
    initUploadAgentAssets: api.initUploadSkillAssets,
    cancelUploadAgentAssets: api.cancelUploadSkillAssets,
    deleteAgentAssets: api.deleteSkillAssets,
  },
  async put({ body }) {
    const content = await body.text();
    if (content === state.failedBody) throw state.putError;
    state.bodies.push(content);
  },
};

const { createSkillServices, createAgentServices } = await loadSourceModule(
  `
  export { createSkillServices } from './src/domains/Skill/service/SkillServices.impl.ts';
  export { createAgentServices } from './src/domains/Agent/service/AgentServices.impl.ts';
`,
  {
    '@domain-apis': `export const SkillApi = globalThis.__assetUploadTest.api;
    export const AgentApi = globalThis.__assetUploadTest.agentApi;
    export const putOssPresignedUrl = globalThis.__assetUploadTest.put;`,
    '@/domains/_shared/ossStsClient': 'export const createOssStsClientManager = () => ({});',
    '@/domains/Resource':
      'export const RESOURCE_SORT_BY = {}; export const RESOURCE_SORT_DIR = {};',
    '@/utils/error': `export const FRONTEND_CLIENT_ERROR = {};
      export const createClientError = () => new Error('client error');`,
    '@/utils/file/computeFileMd5': 'export const computeFileMd5 = async () => "md5";',
    '@/utils/type/typeGuards':
      'export const isRecord = (value) => typeof value === "object" && value !== null;',
    '../mapper/SkillServices.map':
      'export const SkillServicesMap = {resolveAssetResourceType: () => "MD"};',
    '../mapper/AgentServices.map':
      'export const AgentServicesMap = {resolveAssetResourceType: () => "MD"};',
  }
);

const skill = createSkillServices({ resourceService: {} });
const agent = createAgentServices();

test('Skill PUT failure cancels only the candidate and keeps the original error', async () => {
  for (const failCancel of [false, true]) {
    reset();
    const putError = new Error('PUT failed');
    state.failedBody = '# new body';
    state.failCancel = failCancel;
    state.putError = putError;

    const [result] = await skill.uploadAssets('skill-1', 2, [
      { clientId: 'editor', name: 'SKILL.md', path: '/', content: state.failedBody },
    ]);

    assert.equal(result.clientId, 'editor');
    assert.equal(result.error, putError);
    assert.deepEqual(state.canceled, [
      { resourceId: 'skill-1', draftVersion: 2, objectKeys: ['candidate-0'] },
    ]);
    assert.deepEqual(state.deleted, []);
  }
});

test('Skill successful retry and flash upload do not cancel or delete assets', async () => {
  reset();
  const [retry] = await skill.uploadAssets('skill-1', 2, [
    { clientId: 'editor', name: 'SKILL.md', path: '/', content: '# new body' },
  ]);
  assert.equal(retry.error, undefined);
  assert.equal(retry.objectKey, 'candidate-0');
  assert.deepEqual(state.bodies, ['# new body']);
  assert.deepEqual(state.canceled, []);
  assert.deepEqual(state.deleted, []);

  reset();
  state.flash = true;
  const [flash] = await skill.uploadAssets('skill-1', 2, [
    { clientId: 'editor', name: 'SKILL.md', path: '/', content: '# existing body' },
  ]);
  assert.equal(flash.error, undefined);
  assert.equal(flash.objectKey, 'candidate-0');
  assert.deepEqual(state.bodies, []);
  assert.deepEqual(state.canceled, []);
  assert.deepEqual(state.deleted, []);
});

test('partial Skill move failure does not delete source files or successful targets', async () => {
  reset();
  const putError = new Error('second PUT failed');
  state.failedBody = 'failed content';
  state.putError = putError;

  await assert.rejects(
    skill.moveAssets('skill-1', 2, [
      { assetId: 'source-1', name: 'one.md', path: '/target', content: 'successful content' },
      { assetId: 'source-2', name: 'two.md', path: '/target', content: state.failedBody },
    ]),
    (error) => error === putError
  );

  assert.deepEqual(state.canceled, [
    { resourceId: 'skill-1', draftVersion: 2, objectKeys: ['candidate-1'] },
  ]);
  assert.deepEqual(state.deleted, []);
});

test('Agent PUT failure cancels the candidate without deleting the existing asset', async () => {
  reset();
  const putError = new Error('PUT failed');
  state.failedBody = 'new agent body';
  state.failCancel = true;
  state.putError = putError;

  await assert.rejects(
    agent.uploadAsset('agent-1', 3, {
      file: new File([state.failedBody], 'AGENTS.md'),
    }),
    (error) => error === putError
  );

  assert.deepEqual(state.canceled, [
    { resourceId: 'agent-1', draftVersion: 3, objectKeys: ['candidate-0'] },
  ]);
  assert.deepEqual(state.deleted, []);
});

const mock = await loadSourceModule(
  `
  export { assertMockVersionUploadsComplete, cancelMockVersionUploads, initMockVersionAssets } from './src/domains/_shared/mock/versionAssets.mock.ts';
  export { mockObjects, putOssPresignedUrl } from './src/domains/_shared/mock/ossClient.mock.ts';
`,
  {
    '@/utils/error': `export class WisePenError extends Error {
        constructor(options) { super(options.serverMsg); }
      }
      export const FRONTEND_CLIENT_ERROR = {};
      export const createClientError = () => new Error('client error');`,
  }
);

test('mock overwrite preserves the old body on cancel and commits only a successful retry', async () => {
  mock.mockObjects.clear();
  const target = {
    status: 'DRAFT',
    assets: [{ id: 'existing', path: '/', name: 'SKILL.md', objectKey: 'old' }],
  };
  mock.mockObjects.set('old', new Blob(['old body']));
  const requests = [{ path: '/', name: 'SKILL.md', assetResourceType: 'MD', expectedSize: 8 }];

  const [failed] = mock.initMockVersionAssets(target, requests, 'skill');
  assert.equal(failed.assetId, 'existing');
  assert.equal(target.assets[0].objectKey, 'old');
  assert.throws(() => mock.assertMockVersionUploadsComplete(target));
  mock.cancelMockVersionUploads(target, [failed.objectKey]);
  assert.equal(await mock.mockObjects.get('old').text(), 'old body');
  mock.assertMockVersionUploadsComplete(target);

  const [retry] = mock.initMockVersionAssets(target, requests, 'skill');
  await mock.putOssPresignedUrl({ putUrl: retry.putUrl, body: new Blob(['new body']) });
  mock.cancelMockVersionUploads(target, [retry.objectKey]);
  assert.equal(target.assets.length, 1);
  assert.equal(target.assets[0].id, 'existing');
  assert.equal(await mock.mockObjects.get(target.assets[0].objectKey).text(), 'new body');
  mock.assertMockVersionUploadsComplete(target);
});
