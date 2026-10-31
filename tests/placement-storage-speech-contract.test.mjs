import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'placement-storage-speech-'));

try {
  const outfile = join(tempDir, 'placement-storage-speech.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          MountResourcesToGroupApiContract,
          MovePersonalResourcesToTrashApiContract,
          MoveResourcesInGroupApiContract,
          ReplacePersonalNormalTagsApiContract,
          SetPersonalResourcesPathTagApiContract,
          UnmountResourcesToGroupApiContract,
        } from '@/domains/Resource/apis/ResourcePlacementApi.contract';
        export { ImageUploadApiContract } from '@/domains/Image/apis/ImageApi.contract';
        export { IssueRecognitionCredentialApiContract } from '@/domains/Speech/apis/SpeechApi.contract';
        export { ImageApi } from '@/domains/Image/mock/ImageApi.mock';
        export { ResourcePlacementApi } from '@/domains/Resource/mock/ResourcePlacementApi.mock';
        export { SpeechServicesMap } from '@/domains/Speech/mapper/SpeechServices.map';
        export { SpeechApi } from '@/domains/Speech/mock/SpeechApi.mock';
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
    ImageApi,
    ImageUploadApiContract,
    IssueRecognitionCredentialApiContract,
    MountResourcesToGroupApiContract,
    MovePersonalResourcesToTrashApiContract,
    MoveResourcesInGroupApiContract,
    parseApiRequest,
    parseApiResponse,
    ReplacePersonalNormalTagsApiContract,
    ResourcePlacementApi,
    SetPersonalResourcesPathTagApiContract,
    SpeechApi,
    SpeechServicesMap,
    UnmountResourcesToGroupApiContract,
  } = await import(pathToFileURL(outfile).href);

  const placementContracts = [
    MountResourcesToGroupApiContract,
    MovePersonalResourcesToTrashApiContract,
    MoveResourcesInGroupApiContract,
    ReplacePersonalNormalTagsApiContract,
    SetPersonalResourcesPathTagApiContract,
    UnmountResourcesToGroupApiContract,
  ];
  assert.equal(new Set(placementContracts.map((contract) => contract.endpoint)).size, 6);

  const mountRequest = parseApiRequest(MountResourcesToGroupApiContract, {
    resourceIds: ['res-001'],
    groupId: '1001',
    targetTagId: 'tag-1',
  });
  assert.equal(mountRequest.groupId, '1001');
  assert(
    !MountResourcesToGroupApiContract.request.safeParse({
      resourceIds: [],
      groupId: '1001',
      targetTagId: 'tag-1',
    }).success
  );
  const placementResponse = parseApiResponse(
    MountResourcesToGroupApiContract,
    await ResourcePlacementApi.mountResourcesToGroup(mountRequest)
  );
  assert.equal(placementResponse.resourceCount, 1);

  const formData = new FormData();
  formData.append('file', new Blob(['image']), 'test.png');
  formData.append('scene', 'PUBLIC_IMAGE_FOR_USER');
  assert.equal(ImageUploadApiContract.transport, 'multipart');
  const image = parseApiResponse(ImageUploadApiContract, await ImageApi.imageUpload(formData));
  assert.equal(typeof image.fileId, 'string');
  assert.equal(typeof image.size, 'string');
  assert(!ImageUploadApiContract.request.safeParse({}).success);

  const speechRequest = parseApiRequest(
    IssueRecognitionCredentialApiContract,
    SpeechServicesMap.mapIssueRecognitionCredentialRequest({ eosMs: 3000 })
  );
  assert.equal(speechRequest.provider, 'IFLYTEK');
  assert.equal(speechRequest.options.eos_ms, 3000);
  const credential = parseApiResponse(
    IssueRecognitionCredentialApiContract,
    await SpeechApi.issueRecognitionCredential(speechRequest)
  );
  assert.equal(credential.credential.common.app_id, 'mock-app-id');
  assert(
    !IssueRecognitionCredentialApiContract.request.safeParse({
      eos_ms: 3000,
    }).success
  );

  console.log('Placement、存储与语音契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
