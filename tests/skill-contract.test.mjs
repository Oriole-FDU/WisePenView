import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'skill-contract-'));

try {
  const outfile = join(tempDir, 'skill-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          CancelUploadSkillAssetsApiContract,
          ChangeSkillInfoApiContract,
          CreateSkillApiContract,
          DeleteSkillAssetsApiContract,
          ForkSkillApiContract,
          GetSkillAssetStsTokenApiContract,
          GetSkillInfoApiContract,
          GetSkillVersionBundleInfoApiContract,
          InitUploadSkillAssetsApiContract,
          PublishSkillVersionApiContract,
        } from '@/domains/Skill/apis/SkillApi.contract';
        export { SkillApi } from '@/domains/Skill/mock/SkillApi.mock';
      `,
      resolveDir: root,
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    alias: { '@': join(root, 'src') },
  });

  const {
    CancelUploadSkillAssetsApiContract,
    ChangeSkillInfoApiContract,
    CreateSkillApiContract,
    DeleteSkillAssetsApiContract,
    ForkSkillApiContract,
    GetSkillAssetStsTokenApiContract,
    GetSkillInfoApiContract,
    GetSkillVersionBundleInfoApiContract,
    InitUploadSkillAssetsApiContract,
    parseApiRequest,
    parseApiResponse,
    PublishSkillVersionApiContract,
    SkillApi,
  } = await import(pathToFileURL(outfile).href);

  assert.equal(CreateSkillApiContract.requestPlacement, 'body');
  assert.equal(GetSkillInfoApiContract.method, 'POST');
  assert.equal(GetSkillInfoApiContract.requestPlacement, 'query');
  assert.equal(GetSkillAssetStsTokenApiContract.method, 'GET');
  for (const contract of [
    CancelUploadSkillAssetsApiContract,
    ChangeSkillInfoApiContract,
    DeleteSkillAssetsApiContract,
    ForkSkillApiContract,
    InitUploadSkillAssetsApiContract,
    PublishSkillVersionApiContract,
  ]) {
    assert.equal(contract.method, 'POST');
    assert.equal(contract.requestPlacement, 'body');
  }

  const createRequest = parseApiRequest(CreateSkillApiContract, {
    title: '  研究助手  ',
    name: 'research-helper',
    description: '整理资料',
    sourceType: 'MANUAL',
  });
  assert.equal(createRequest.title, '研究助手');
  assert(
    !CreateSkillApiContract.request.safeParse({
      title: '非法来源',
      sourceType: 'IMPORTED',
    }).success
  );

  const info = parseApiResponse(
    GetSkillInfoApiContract,
    await SkillApi.getSkillInfo({ resourceId: 'mock-skill' })
  );
  assert.equal(info.resourceInfo.resourceType, 'SKILL');
  assert.equal(info.skillInfo.version, 0);

  const bundle = parseApiResponse(
    GetSkillVersionBundleInfoApiContract,
    await SkillApi.getSkillVersionBundleInfo({ resourceId: 'mock-skill', version: 1 })
  );
  assert.equal(bundle.assets[0].name, 'SKILL.md');
  assert.equal(bundle.assets[0].pendingUpload, null);

  const sts = parseApiResponse(
    GetSkillAssetStsTokenApiContract,
    await SkillApi.getSkillAssetStsToken({ resourceId: 'mock-skill' })
  );
  assert.equal(typeof sts.expiration, 'number');

  assert(
    !InitUploadSkillAssetsApiContract.request.safeParse({
      resourceId: 'mock-skill',
      draftVersion: 1,
      assets: [{ name: 'SKILL.md', path: 'bad', assetResourceType: 'MD' }],
    }).success
  );
  assert(
    !InitUploadSkillAssetsApiContract.request.safeParse({
      resourceId: 'mock-skill',
      draftVersion: 1,
      assets: [],
    }).success
  );

  const initResponse = {
    resourceId: 'mock-skill',
    version: 2,
    assetUploadTickets: [
      {
        assetId: 'asset-1',
        path: '/',
        name: 'SKILL.md',
        objectKey: 'asset-1/SKILL.md',
        putUrl: null,
        callbackHeader: null,
        flashUploaded: true,
      },
    ],
  };
  assert.equal(InitUploadSkillAssetsApiContract.response.safeParse(initResponse).success, true);
  assert(
    !InitUploadSkillAssetsApiContract.response.safeParse({
      ...initResponse,
      assetUploadTickets: [{ ...initResponse.assetUploadTickets[0], flashUploaded: 'true' }],
    }).success
  );

  console.log('Skill API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
