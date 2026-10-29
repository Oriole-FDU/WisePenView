import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'resource-core-contract-'));

try {
  const outfile = join(tempDir, 'resource-core-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          ChangeResourceActionPermissionApiContract,
          GlobalSearchResourcesApiContract,
          ListResourcesApiContract,
          RemoveResourcesApiContract,
          RenameResourceApiContract,
        } from '@/domains/Resource/apis/ResourceCoreApi.contract';
        export { ChangeResourceActionPermissionApiRequestSchema } from '@/domains/Resource/apis/ResourceCoreApi.schema';
        export { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
        export { ResourceItemApi } from '@/domains/Resource/mock/ResourceApi.mock';
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
    ChangeResourceActionPermissionApiContract,
    ChangeResourceActionPermissionApiRequestSchema,
    GlobalSearchResourcesApiContract,
    ListResourcesApiContract,
    parseApiRequest,
    parseApiResponse,
    RemoveResourcesApiContract,
    RenameResourceApiContract,
    ResourceItemApi,
    ResourceServicesMap,
  } = await import(pathToFileURL(outfile).href);

  for (const contract of [ListResourcesApiContract, GlobalSearchResourcesApiContract]) {
    assert.equal(contract.method, 'GET');
    assert.equal(contract.requestPlacement, 'query');
  }
  for (const contract of [
    RenameResourceApiContract,
    ChangeResourceActionPermissionApiContract,
    RemoveResourcesApiContract,
  ]) {
    assert.equal(contract.method, 'POST');
    assert.equal(contract.requestPlacement, 'body');
  }

  const listRequest = parseApiRequest(ListResourcesApiContract, {
    page: 1,
    size: 20,
    sortBy: 'UPDATE_TIME',
    sortDir: 'DESC',
    tagQueryLogicMode: 'OR',
    includeMyInteraction: false,
    resourceType: 'PDF',
    tagIds: ['tag-1'],
  });
  assert.equal(listRequest.includeMyInteraction, false);
  assert(!ListResourcesApiContract.request.safeParse({ page: 1, size: 101 }).success);
  assert(
    !ListResourcesApiContract.request.safeParse({
      page: 1,
      size: 20,
      sortBy: 'UPDATE_TIME',
      sortDir: 'DESC',
      tagQueryLogicMode: 'OR',
      resourceType: 'pdf',
    }).success
  );

  const resourceItem = {
    resourceId: 'resource-1',
    resourceName: '数据结构.pdf',
    resourceType: 'PDF',
    ownerId: '10086',
    ownerInfo: {
      nickname: '示例用户',
      username: null,
      avatar: null,
      identityType: 1,
      realName: null,
      campusNo: null,
      email: null,
      mobile: null,
    },
    preview: null,
    size: '2048',
    resourceInteractionInfo: {
      readCount: 2,
      likeCount: 1,
      scoreCount: 0,
      scoreTotal: 0,
      favoriteCount: 0,
      commentCount: 0,
    },
    myInteractionRecord: null,
    tagBinds: [
      {
        groupId: 'p_10086',
        primaryTagId: 'tag-1',
        tags: {
          'tag-1': {
            groupId: 'p_10086',
            tagName: '课程资料',
            tagDesc: null,
            tagIcon: null,
            tagColor: null,
            tagMetaInfo: null,
            tagCreator: null,
            isPath: true,
          },
        },
      },
    ],
    currentActions: ['DISCOVER', 'VIEW'],
    overrideGrantedActions: null,
    specifiedUsersGrantedActions: null,
  };
  const listResponse = {
    list: [resourceItem],
    total: '1',
    page: 1,
    size: 20,
    totalPage: 1,
  };
  const parsedList = parseApiResponse(ListResourcesApiContract, listResponse);
  const mappedPage = ResourceServicesMap.mapResourceListPageFromApi(parsedList, {
    groupId: 'p_10086',
  });
  assert.equal(mappedPage.list[0].size, 2048);
  assert.equal(mappedPage.list[0].mainTagId, 'tag-1');

  const numericSize = structuredClone(listResponse);
  numericSize.list[0].size = 2048;
  assert(!ListResourcesApiContract.response.safeParse(numericSize).success);

  const renameRequest = parseApiRequest(RenameResourceApiContract, {
    resourceId: 'resource-1',
    newName: '  新名称.pdf  ',
  });
  assert.equal(renameRequest.newName, '新名称.pdf');

  const permissionRequest = parseApiRequest(ChangeResourceActionPermissionApiContract, {
    resourceId: 'resource-1',
    overrideGrantedActions: { 2: null, 3: ['VIEW', 'EDIT'] },
    specifiedUsersGrantedActions: null,
  });
  assert.equal(permissionRequest.overrideGrantedActions?.['2'], null);
  assert(
    ChangeResourceActionPermissionApiRequestSchema.safeParse({
      resourceId: 'resource-1',
      overrideGrantedActions: { 2: [] },
    }).success
  );

  const searchResponse = {
    list: [
      {
        resourceId: 'resource-1',
        resourceType: 'PDF',
        resourceName: '<em class="wp-highlight">数据</em>结构.pdf',
        highlightContent: null,
        updateTime: 1_779_483_700_000,
      },
    ],
    total: '1',
    page: 1,
    size: 20,
    totalPage: 1,
  };
  const mappedSearch = ResourceServicesMap.mapSearchResultPageFromApi(
    parseApiResponse(GlobalSearchResourcesApiContract, searchResponse)
  );
  assert.equal(mappedSearch.list[0].resourceType, 'pdf');

  const mockList = await ResourceItemApi.listResources({
    page: 1,
    size: 20,
    sortBy: 'NAME',
    sortDir: 'ASC',
    tagQueryLogicMode: 'OR',
    groupId: '1',
  });
  const parsedMockList = parseApiResponse(ListResourcesApiContract, {
    ...mockList,
    total: String(mockList.total),
  });
  assert(parsedMockList.list.length > 0);

  const mockSearch = await ResourceItemApi.globalSearch({
    keyword: '数据结构',
    scope: 'ALL',
    page: 1,
    size: 20,
  });
  const parsedMockSearch = parseApiResponse(GlobalSearchResourcesApiContract, {
    ...mockSearch,
    total: String(mockSearch.total),
  });
  assert(parsedMockSearch.list.length > 0);

  console.log('ResourceCore API 契约检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
