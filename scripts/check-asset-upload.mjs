import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const state = {
  failPut: false,
  failCancel: false,
  flash: false,
  failedBody: undefined,
  deleted: [],
  canceled: [],
  bodies: [],
};
const api = {
  async initUploadSkillAssets({ assets }) {
    return {
      assetUploadTickets: assets.map((asset, index) => ({
        assetId: `existing-${index}`,
        objectKey: `candidate-${index}`,
        name: asset.name,
        path: asset.path,
        ...(!state.flash && { putUrl: `candidate-${index}`, callbackHeader: 'callback' }),
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
globalThis.__assetUploadCheck = {
  api,
  agentApi: {
    initUploadAgentAssets: api.initUploadSkillAssets,
    cancelUploadAgentAssets: api.cancelUploadSkillAssets,
    deleteAgentAssets: api.deleteSkillAssets,
  },
  async put({ body }) {
    const content = await body.text();
    if (state.failPut || content === state.failedBody) throw new Error('PUT failed');
    state.bodies.push(content);
  },
};

async function bundle(contents, stubs) {
  const result = await build({
    absWorkingDir: root,
    stdin: { contents, resolveDir: root },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    tsconfig: 'tsconfig.app.json',
    plugins: [
      {
        name: 'isolated-boundaries',
        setup(build) {
          build.onResolve({ filter: /.*/ }, ({ path }) =>
            path in stubs ? { path, namespace: 'stub' } : undefined
          );
          build.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path }) => ({
            contents: stubs[path],
          }));
        },
      },
    ],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
  );
}

const errorStub =
  'export class WisePenError extends Error { constructor(options) { super(options.serverMsg); } } export const FRONTEND_CLIENT_ERROR = {}; export const createClientError = () => new Error("client error");';
const { createSkillServices, createAgentServices } = await bundle(
  `
  export { createSkillServices } from './src/domains/Skill/service/SkillServices.impl.ts';
  export { createAgentServices } from './src/domains/Agent/service/AgentServices.impl.ts';
`,
  {
    '@domain-apis': `export const SkillApi = globalThis.__assetUploadCheck.api;
    export const AgentApi = globalThis.__assetUploadCheck.agentApi;
    export const putOssPresignedUrl = globalThis.__assetUploadCheck.put;`,
    '@/domains/_shared/ossStsClient': 'export const createOssStsClientManager = () => ({});',
    '@/domains/Resource':
      'export const RESOURCE_SORT_BY = {}; export const RESOURCE_SORT_DIR = {};',
    '@/utils/error': errorStub,
    '@/utils/file/computeFileMd5': 'export const computeFileMd5 = async () => "md5";',
    '../mapper/SkillServices.map':
      'export const SkillServicesMap = {resolveAssetResourceType: () => "MD"};',
    '../mapper/AgentServices.map':
      'export const AgentServicesMap = {resolveAssetResourceType: () => "MD"};',
  }
);

test('真实 Skill / Agent service 在失败时仅取消候选，保留原错误并可重试', async () => {
  const skill = createSkillServices({ resourceService: {} });
  const requests = [{ clientId: 'editor', name: 'SKILL.md', path: '/', content: '# new body' }];
  state.failPut = true;
  for (const failCancel of [false, true]) {
    state.failCancel = failCancel;
    const [result] = await skill.uploadAssets('resource', 1, requests);
    assert.equal(result.clientId, 'editor');
    assert.equal(result.error.message, 'PUT failed');
    assert.deepEqual(state.canceled.at(-1), {
      resourceId: 'resource',
      draftVersion: 1,
      objectKeys: ['candidate-0'],
    });
    assert.deepEqual(state.deleted, []);
  }
  state.failCancel = false;
  await assert.rejects(
    createAgentServices().uploadAsset('agent', 1, {
      file: new File(['new'], 'notes.md'),
    }),
    /PUT failed/
  );
  assert.equal(state.canceled.at(-1).resourceId, 'agent');
  assert.deepEqual(state.deleted, []);

  state.failPut = false;
  const cancelCount = state.canceled.length;
  const [saved] = await skill.uploadAssets('resource', 1, requests);
  assert.equal(saved.error, undefined);
  assert.equal(saved.objectKey, 'candidate-0');
  assert.deepEqual(state.bodies, ['# new body']);
  state.flash = true;
  const [flash] = await skill.uploadAssets('resource', 1, requests);
  assert.equal(flash.error, undefined);
  assert.equal(state.bodies.length, 1);
  assert.equal(state.canceled.length, cancelCount);

  state.flash = false;
  state.failedBody = 'failed move';
  await assert.rejects(
    skill.moveAssets('resource', 1, [
      { assetId: 'source-a', name: 'a.md', path: '/target', content: 'successful move' },
      { assetId: 'source-b', name: 'b.md', path: '/target', content: 'failed move' },
    ]),
    /PUT failed/
  );
  assert.deepEqual(state.deleted, [], '部分移动失败不能回滚删除原文件或已成功的覆盖目标');
});

const mock = await bundle(
  `
  export * from './src/domains/_shared/mock/versionAssets.mock.ts';
  export * from './src/domains/_shared/mock/ossClient.mock.ts';
`,
  { '@/utils/error': errorStub }
);

test('mock 覆盖保持旧正文，取消不删除旧文件或已成功的新文件，重试可读回', async () => {
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
  assert.equal(await mock.mockObjects.get(target.assets[0].objectKey).text(), 'old body');
  mock.assertMockVersionUploadsComplete(target);

  const [retry] = mock.initMockVersionAssets(target, requests, 'skill');
  mock.cancelMockVersionUploads(target, [failed.objectKey]);
  await mock.putOssPresignedUrl({ ...retry, body: new Blob(['new body']) });
  mock.cancelMockVersionUploads(target, [retry.objectKey]);
  assert.equal(target.assets.length, 1);
  assert.equal(target.assets[0].id, 'existing');
  assert.equal(await mock.mockObjects.get(target.assets[0].objectKey).text(), 'new body');
  mock.assertMockVersionUploadsComplete(target);
});
