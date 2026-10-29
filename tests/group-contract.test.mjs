import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'group-contract-'));

try {
  const outfile = join(tempDir, 'group-contract.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { parseApiRequest, parseApiResponse } from '@/apis/contract';
        export {
          AddGroupApiContract,
          ChangeGroupApiContract,
          ChangeGroupConfigApiContract,
          ChangeGroupMemberRoleApiContract,
          ChangeGroupMemberTokenLimitApiContract,
          GetAllMyGroupTokenInfoApiContract,
          GetGroupBaseInfoApiContract,
          GetGroupConfigApiContract,
          GetGroupDetailInfoApiContract,
          GetMyGroupMemberInfoApiContract,
          GetMyRoleInGroupApiContract,
          JoinGroupApiContract,
          KickGroupMembersApiContract,
          ListGroupApiContract,
          ListGroupMemberApiContract,
          QuitGroupApiContract,
          RemoveGroupApiContract,
        } from '@/domains/Group/apis/GroupApi.contract';
        export {
          AddGroupApiRequestSchema,
          ChangeGroupMemberRoleApiRequestSchema,
          GetAllMyGroupTokenInfoApiResponseSchema,
          GroupDetailApiSchema,
          GroupItemApiSchema,
          GroupMemberDetailApiSchema,
          ListGroupApiRequestSchema,
        } from '@/domains/Group/apis/GroupApi.schema';
        export { GroupServicesMap } from '@/domains/Group/mapper/GroupServices.map';
        export { GroupQuotaMap } from '@/domains/Group/mapper/groupQuota.mapper';
        export {
          GroupApi,
          GroupMemberApi,
          GroupResConfigApi,
        } from '@/domains/Group/mock/GroupApi.mock';
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
    AddGroupApiContract,
    AddGroupApiRequestSchema,
    ChangeGroupApiContract,
    ChangeGroupConfigApiContract,
    ChangeGroupMemberRoleApiContract,
    ChangeGroupMemberRoleApiRequestSchema,
    ChangeGroupMemberTokenLimitApiContract,
    GetAllMyGroupTokenInfoApiContract,
    GetAllMyGroupTokenInfoApiResponseSchema,
    GetGroupBaseInfoApiContract,
    GetGroupConfigApiContract,
    GetGroupDetailInfoApiContract,
    GetMyGroupMemberInfoApiContract,
    GetMyRoleInGroupApiContract,
    GroupApi,
    GroupDetailApiSchema,
    GroupItemApiSchema,
    GroupMemberApi,
    GroupMemberDetailApiSchema,
    GroupQuotaMap,
    GroupResConfigApi,
    GroupServicesMap,
    JoinGroupApiContract,
    KickGroupMembersApiContract,
    ListGroupApiContract,
    ListGroupApiRequestSchema,
    ListGroupMemberApiContract,
    parseApiRequest,
    parseApiResponse,
    QuitGroupApiContract,
    RemoveGroupApiContract,
  } = await import(pathToFileURL(outfile).href);

  for (const contract of [
    AddGroupApiContract,
    ChangeGroupApiContract,
    ChangeGroupConfigApiContract,
    ChangeGroupMemberRoleApiContract,
    ChangeGroupMemberTokenLimitApiContract,
    JoinGroupApiContract,
    KickGroupMembersApiContract,
    QuitGroupApiContract,
    RemoveGroupApiContract,
  ]) {
    assert.equal(contract.method, 'POST');
    assert.equal(contract.requestPlacement, 'body');
    assert.equal(contract.transport, 'json');
  }
  for (const contract of [
    GetAllMyGroupTokenInfoApiContract,
    GetGroupBaseInfoApiContract,
    GetGroupConfigApiContract,
    GetGroupDetailInfoApiContract,
    GetMyGroupMemberInfoApiContract,
    GetMyRoleInGroupApiContract,
    ListGroupApiContract,
    ListGroupMemberApiContract,
  ]) {
    assert.equal(contract.method, 'GET');
    assert.equal(contract.requestPlacement, 'query');
    assert.equal(contract.transport, 'json');
  }

  assert.deepEqual(
    parseApiRequest(ListGroupApiContract, {
      groupRoleFilter: 'ALL',
      groupType: 'ADVANCED_GROUP',
      page: 1,
      size: 20,
    }),
    {
      groupRoleFilter: 'ALL',
      groupType: 'ADVANCED_GROUP',
      page: 1,
      size: 20,
    }
  );
  assert(
    !ListGroupApiRequestSchema.safeParse({
      groupRoleFilter: 'ALL',
      groupType: 2,
      page: 1,
      size: 20,
    }).success
  );
  assert(
    !ListGroupApiRequestSchema.safeParse({
      groupRoleFilter: 'ALL',
      page: 0,
      size: 20,
    }).success
  );

  const addRequest = parseApiRequest(AddGroupApiContract, {
    groupName: '  数据结构  ',
    groupType: 2,
    groupDesc: '  课程小组  ',
  });
  assert.equal(addRequest.groupName, '数据结构');
  assert.equal(addRequest.groupDesc, '课程小组');
  assert(
    !AddGroupApiRequestSchema.safeParse({
      groupName: '课程',
      groupType: 'ADVANCED_GROUP',
      groupDesc: '说明',
    }).success
  );
  assert(
    !AddGroupApiRequestSchema.safeParse({
      groupName: '课程',
      groupType: 2,
      groupDesc: '说明',
      ignored: true,
    }).success
  );

  assert(
    ChangeGroupMemberRoleApiRequestSchema.safeParse({
      groupId: '1',
      targetUserIds: ['2'],
      role: 1,
    }).success
  );
  assert(
    !ChangeGroupMemberRoleApiRequestSchema.safeParse({
      groupId: '1',
      targetUserIds: ['2'],
      role: '1',
    }).success
  );

  const listPayload = await GroupApi.list({
    groupRoleFilter: 'ALL',
    page: 1,
    size: 20,
  });
  const list = parseApiResponse(ListGroupApiContract, listPayload);
  assert.equal(typeof list.list[0].groupType, 'number');
  assert.equal(typeof list.list[0].groupId, 'string');
  assert.equal(typeof list.list[0].createTime, 'number');

  const group = list.list[0];
  assert(GroupItemApiSchema.safeParse(group).success);
  assert(!GroupItemApiSchema.safeParse({ ...group, groupType: '2' }).success);
  assert(!GroupItemApiSchema.safeParse({ ...group, groupId: 1 }).success);
  assert(!GroupItemApiSchema.safeParse({ ...group, createTime: '2026-01-01' }).success);
  assert(!GroupItemApiSchema.safeParse({ ...group, memberCount: '2' }).success);

  const detail = parseApiResponse(
    GetGroupDetailInfoApiContract,
    await GroupApi.getGroupDetailInfo({ groupId: '1' })
  );
  assert(GroupDetailApiSchema.safeParse(detail).success);
  assert.equal(typeof detail.tokenBalance, 'number');

  const base = parseApiResponse(
    GetGroupBaseInfoApiContract,
    await GroupApi.getGroupBaseInfo({ groupId: '1' })
  );
  assert.equal(base.groupId, '1');

  const membersPayload = await GroupMemberApi.list({ groupId: '1', page: 1, size: 20 });
  const members = parseApiResponse(ListGroupMemberApiContract, membersPayload);
  assert.equal(typeof members.list[0].role, 'number');
  assert.equal(typeof members.list[0].joinTime, 'number');
  assert(GroupMemberDetailApiSchema.safeParse(members.list[0]).success);
  assert(!GroupMemberDetailApiSchema.safeParse({ ...members.list[0], role: '0' }).success);
  assert(
    !GroupMemberDetailApiSchema.safeParse({ ...members.list[0], joinTime: '2026-01-01' }).success
  );

  const memberInfo = parseApiResponse(
    GetMyGroupMemberInfoApiContract,
    await GroupMemberApi.getMyGroupMemberInfo({ groupId: '1' })
  );
  assert.equal(memberInfo.memberId, '1');

  const myRole = parseApiResponse(GetMyRoleInGroupApiContract, await GroupMemberApi.getMyRole('1'));
  assert.equal(myRole, 0);

  const quotas = parseApiResponse(
    GetAllMyGroupTokenInfoApiContract,
    await GroupMemberApi.getAllMyGroupTokenInfo({ page: 1, size: 20 })
  );
  assert(GetAllMyGroupTokenInfoApiResponseSchema.safeParse(quotas).success);
  assert(!Object.hasOwn(quotas.list[0].groupDisplayBase, 'groupId'));

  const folderConfig = parseApiResponse(
    GetGroupConfigApiContract,
    await GroupResConfigApi.getConfig({ groupId: '1' })
  );
  assert.equal(folderConfig.fileOrgLogic, 'FOLDER');
  const mappedConfig = GroupServicesMap.mapFetchGroupResConfigFromApi(folderConfig);
  assert.equal(mappedConfig.fileOrgLogic, 'FOLDER');
  assert.deepEqual(mappedConfig.defaultMemberActions, ['DISCOVER', 'VIEW', 'DOWNLOAD_WATERMARK']);

  const updateConfig = GroupServicesMap.mapUpdateGroupResConfigRequest({
    groupId: '1',
    fileOrgLogic: 'TAG',
    defaultMemberActions: ['EDIT'],
  });
  assert.equal(updateConfig.fileOrgLogic, 'TAG');
  assert.deepEqual(updateConfig.defaultMemberActions, ['DISCOVER', 'VIEW', 'EDIT']);

  const mappedList = GroupServicesMap.mapFetchGroupListFromApi(list);
  assert.equal(mappedList.groups[0].groupType, 1);
  assert.equal(mappedList.groups[0].ownerId, '1');
  assert.equal(GroupServicesMap.mapGroupFromApi(detail).tokenBalance, detail.tokenBalance);

  const mappedMembers = GroupServicesMap.mapFetchGroupMembersFromApi(members);
  assert.equal(mappedMembers.members[0].userId, '1');
  assert.equal(mappedMembers.members[0].role, 'OWNER');
  assert.equal(GroupServicesMap.mapFetchMyRoleInGroupFromApi(2), 'MEMBER');
  assert.equal(GroupServicesMap.mapFetchMyRoleInGroupFromApi(-1), null);

  const mappedQuotas = GroupQuotaMap.mapFetchUserGroupQuotasFromApi(quotas);
  assert(!Object.hasOwn(mappedQuotas.quotas[0], 'groupId'));
  assert.equal(mappedQuotas.quotas[0].quotaLimit, 1000);

  const createdId = parseApiResponse(
    AddGroupApiContract,
    await GroupApi.addGroup({
      groupName: '契约验证',
      groupType: 1,
      groupDesc: '验证 contract',
    })
  );
  assert.match(createdId, /^\d+$/);
  assert.equal(
    parseApiResponse(
      ChangeGroupConfigApiContract,
      await GroupResConfigApi.changeConfig({
        groupId: createdId,
        fileOrgLogic: 'TAG',
        defaultMemberActions: ['VIEW'],
      })
    ),
    null
  );
  assert.equal(
    parseApiResponse(
      ChangeGroupApiContract,
      await GroupApi.changeGroup({
        groupId: createdId,
        groupName: '契约验证',
        groupType: 1,
        groupDesc: '更新完成',
        groupCoverUrl: '',
      })
    ),
    null
  );
  assert.equal(
    parseApiResponse(
      ChangeGroupMemberRoleApiContract,
      await GroupMemberApi.changeRole({
        groupId: '1',
        targetUserIds: ['2'],
        role: 1,
      })
    ),
    null
  );
  assert.equal(
    parseApiResponse(
      ChangeGroupMemberTokenLimitApiContract,
      await GroupMemberApi.changeTokenLimit({
        groupId: '1',
        targetUserIds: ['2'],
        newTokenLimit: 6000,
      })
    ),
    null
  );
  assert.equal(
    parseApiResponse(
      KickGroupMembersApiContract,
      await GroupMemberApi.kick({
        groupId: '1',
        targetUserIds: ['12'],
      })
    ),
    null
  );
  assert.equal(
    parseApiResponse(QuitGroupApiContract, await GroupMemberApi.quit({ groupId: '2' })),
    null
  );
  assert.equal(
    parseApiResponse(JoinGroupApiContract, await GroupApi.joinGroup({ inviteCode: 'ABCD1234' })),
    null
  );
  assert.equal(
    parseApiResponse(RemoveGroupApiContract, await GroupApi.removeGroup({ groupId: createdId })),
    null
  );

  for (const removedMapper of [
    'mapFetchGroupInfoRequest',
    'mapFetchGroupBaseInfoRequest',
    'mapFetchGroupResConfigRequest',
    'mapCreateGroupFromApi',
    'mapUpdateMemberRoleRequest',
    'mapFetchGroupMembersRequest',
    'mapFetchMyRoleInGroupRequest',
    'mapGroupWalletInfoFromApi',
  ]) {
    assert(!Object.hasOwn(GroupServicesMap, removedMapper), `${removedMapper} 应已删除`);
  }

  console.log('Group API 契约与 mapper 边界检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
