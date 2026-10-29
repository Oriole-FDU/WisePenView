import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'tag-contract-'));

try {
  const outfile = join(tempDir, 'tag-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          AddTagApiContract,
          ChangeTagApiContract,
          GetTagTreeApiContract,
          MoveTagsApiContract,
          RemoveTagsApiContract,
        } from '@/domains/Tag/apis/TagApi.contract';
        export {
          AddTagApiRequestSchema,
          ChangeTagApiRequestSchema,
          MoveTagsApiRequestSchema,
          RemoveTagsApiRequestSchema,
          TagPolicyApiSchema,
          TagTreeApiResponseSchema,
        } from '@/domains/Tag/apis/TagApi.schema';
        export { TagServicesMap } from '@/domains/Tag/mapper/TagServices.map';
        export { TagApi } from '@/domains/Tag/mock/TagApi.mock';
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
    AddTagApiContract,
    AddTagApiRequestSchema,
    ChangeTagApiContract,
    ChangeTagApiRequestSchema,
    GetTagTreeApiContract,
    MoveTagsApiContract,
    MoveTagsApiRequestSchema,
    parseApiRequest,
    parseApiResponse,
    RemoveTagsApiContract,
    RemoveTagsApiRequestSchema,
    TagApi,
    TagPolicyApiSchema,
    TagServicesMap,
    TagTreeApiResponseSchema,
  } = await import(pathToFileURL(outfile).href);

  assert.equal(GetTagTreeApiContract.method, 'GET');
  assert.equal(GetTagTreeApiContract.requestPlacement, 'query');
  assert.equal(GetTagTreeApiContract.transport, 'json');
  for (const contract of [
    AddTagApiContract,
    ChangeTagApiContract,
    MoveTagsApiContract,
    RemoveTagsApiContract,
  ]) {
    assert.equal(contract.method, 'POST');
    assert.equal(contract.requestPlacement, 'body');
    assert.equal(contract.transport, 'json');
  }
  assert.deepEqual(parseApiRequest(GetTagTreeApiContract, {}), {});
  assert.deepEqual(parseApiRequest(GetTagTreeApiContract, { groupId: 'group-1' }), {
    groupId: 'group-1',
  });

  const addRequest = parseApiRequest(AddTagApiContract, {
    groupId: 'group-1',
    parentId: '0',
    tagName: '  项目资料  ',
    taggedResourceAclGrantScope: 'WHITELIST',
    taggedResourceAclGrantSpecifiedUsers: ['10086'],
    grantedActions: ['VIEW'],
  });
  assert.equal(addRequest.tagName, '项目资料');
  assert(!AddTagApiRequestSchema.safeParse({ tagName: '   ' }).success);
  assert(!AddTagApiRequestSchema.safeParse({ tagName: '资料', visibilityMode: '0' }).success);
  assert(!AddTagApiRequestSchema.safeParse({ tagName: '资料', isPath: true }).success);
  assert(!AddTagApiRequestSchema.safeParse({ tagName: '资料', tagCreator: '10086' }).success);
  assert(
    !AddTagApiRequestSchema.safeParse({
      tagName: '资料',
      taggedResourceAclGrantSpecifiedUsers: [10086],
    }).success
  );

  assert(ChangeTagApiRequestSchema.safeParse({ targetTagId: 'tag-1' }).success);
  assert(!ChangeTagApiRequestSchema.safeParse({}).success);
  assert(!ChangeTagApiRequestSchema.safeParse({ targetTagId: 'tag-1', parentId: 'tag-2' }).success);
  assert(!RemoveTagsApiRequestSchema.safeParse({ targetTagIds: [] }).success);
  assert(MoveTagsApiRequestSchema.safeParse({ targetTagIds: ['tag-1'] }).success);
  assert(!MoveTagsApiRequestSchema.safeParse({ targetTagIds: [''] }).success);

  const personalTree = await TagApi.getTagTree();
  const parsedTree = parseApiResponse(GetTagTreeApiContract, personalTree);
  assert(parsedTree.length > 0);
  assert.equal(parsedTree[0].groupId, 'p_mock-user');
  assert(parsedTree[0].children.length > 0);

  const groupTree = await TagApi.getTagTree({ groupId: '2' });
  assert(TagTreeApiResponseSchema.safeParse(groupTree).success);
  assert(TagPolicyApiSchema.safeParse(groupTree[0]).success);

  const mappedTree = TagServicesMap.mapTagTreeFromApi(groupTree);
  assert.equal(mappedTree[0].creatorInfo?.nickname, '小明');
  assert.equal(mappedTree[0].creatorInfo?.email, undefined);
  assert.equal(mappedTree[0].taggedResourceAclGrantScope, undefined);
  assert.deepEqual(mappedTree[0].grantedActions, ['DISCOVER', 'VIEW', 'EDIT']);

  const requestPayload = TagServicesMap.mapAddTagRequest({
    groupId: 'group-1',
    tagName: '资料',
    tagMetaInfo: { schema: 'wisepen.tag-meta.v1', sortOrder: 1024 },
    grantedActions: ['EDIT'],
  });
  assert.equal(requestPayload.tagMetaInfo, '{"schema":"wisepen.tag-meta.v1","sortOrder":1024}');
  assert.deepEqual(requestPayload.grantedActions, ['DISCOVER', 'VIEW', 'EDIT']);

  const invalidActionTree = structuredClone(groupTree);
  invalidActionTree[0].grantedActions = ['UNKNOWN_ACTION'];
  assert(!TagTreeApiResponseSchema.safeParse(invalidActionTree).success);

  const missingChildren = structuredClone(groupTree);
  delete missingChildren[0].children;
  assert(!TagTreeApiResponseSchema.safeParse(missingChildren).success);
  assert(!TagTreeApiResponseSchema.safeParse({ ...groupTree[0], groupId: undefined }).success);

  console.log('Tag API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
