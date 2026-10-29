import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  GroupApi as GroupApiContract,
  GroupMemberApi as GroupMemberApiContract,
  GroupResConfigApi as GroupResConfigApiContract,
} from '../apis/GroupApi';
import type {
  AddGroupApiResponse,
  ChangeGroupApiResponse,
  ChangeGroupConfigApiResponse,
  ChangeGroupMemberRoleApiResponse,
  ChangeGroupMemberTokenLimitApiResponse,
  GetAllMyGroupTokenInfoApiResponse,
  GetGroupBaseInfoApiResponse,
  GetGroupConfigApiResponse,
  GetGroupDetailInfoApiResponse,
  GetMyGroupMemberInfoApiResponse,
  GetMyRoleInGroupApiResponse,
  JoinGroupApiResponse,
  KickGroupMembersApiResponse,
  ListGroupApiResponse,
  ListGroupMemberApiResponse,
  QuitGroupApiResponse,
  RemoveGroupApiResponse,
} from '../apis/GroupApi.contract';
import type {
  GroupDetailApi,
  GroupItemApi,
  GroupMemberDetailApi,
  GroupRoleApi,
  GroupTypeApi,
} from '../apis/GroupApi.schema';
import mockdata from './mockdata.json';

type MockUserDisplay = {
  nickname?: string | null;
  username?: string | null;
  avatar?: string | null;
  identityType?: number | null;
  realName?: string | null;
  campusNo?: string | null;
  email?: string | null;
  mobile?: string | null;
};

const normalizeIdentityType = (value: number | null | undefined): 1 | 2 | 3 | null => {
  if (value == null) return null;
  if (value === 1 || value === 2 || value === 3) return value;
  throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
};

const normalizeUserDisplay = (value: MockUserDisplay | null | undefined) => {
  if (!value) return null;
  return {
    nickname: value.nickname ?? null,
    username: value.username ?? null,
    avatar: value.avatar ?? null,
    identityType: normalizeIdentityType(value.identityType),
    realName: value.realName ?? null,
    campusNo: value.campusNo ?? null,
    email: value.email ?? null,
    mobile: value.mobile ?? null,
  };
};

const normalizeGroupType = (value: number): GroupTypeApi => {
  if (value === 1 || value === 2 || value === 3) return value;
  throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
};

const toEpochMillis = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
  }
  return timestamp;
};

const toGroupItem = (group: GroupDetailApi): GroupItemApi => ({
  groupId: group.groupId,
  groupName: group.groupName,
  groupDesc: group.groupDesc,
  groupCoverUrl: group.groupCoverUrl,
  groupMetaInfo: group.groupMetaInfo,
  groupType: group.groupType,
  ownerId: group.ownerId,
  ownerInfo: group.ownerInfo,
  memberCount: group.memberCount,
  createTime: group.createTime,
});

const normalizeGroup = (group: (typeof mockdata.groups)[number]): GroupDetailApi => ({
  groupId: group.groupId,
  groupName: group.groupName,
  groupDesc: group.groupDesc,
  groupCoverUrl: group.groupCoverUrl ?? '',
  groupMetaInfo: group.groupMetaInfo ?? null,
  groupType: normalizeGroupType(group.groupType),
  ownerId: group.ownerId,
  ownerInfo: normalizeUserDisplay(group.ownerInfo),
  memberCount: group.memberCount,
  createTime: toEpochMillis(group.createTime),
  inviteCode: group.inviteCode ?? `MOCK-${group.groupId}`,
  tokenUsed: group.tokenUsed ?? 0,
  tokenBalance: group.tokenBalance ?? 0,
});

const normalizeMember = (
  member: (typeof mockdata.members)[keyof typeof mockdata.members][number]
): GroupMemberDetailApi => ({
  role: Number(member.role) as GroupMemberDetailApi['role'],
  joinTime:
    toEpochMillis(member.joinTime) ??
    (() => {
      throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
    })(),
  tokenLimit: member.tokenLimit,
  tokenUsed: member.tokenUsed,
  groupId: member.groupId,
  memberId: member.memberId,
  memberInfo: normalizeUserDisplay(member.memberInfo),
});

const groups = new Map<string, GroupDetailApi>(
  mockdata.groups.map((group) => [group.groupId, normalizeGroup(group)])
);
const members = new Map<string, GroupMemberDetailApi[]>(
  Object.entries(mockdata.members).map(([groupId, groupMembers]) => [
    groupId,
    groupMembers.map(normalizeMember),
  ])
);
const normalizeRole = (value: number): GroupRoleApi => {
  if (value === 0 || value === 1 || value === 2 || value === -1) return value;
  throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
};

const roles = new Map<string, GroupRoleApi>(
  Object.entries(mockdata.myRoles).map(([groupId, role]) => [groupId, normalizeRole(Number(role))])
);
const configs = new Map<string, GetGroupConfigApiResponse>();

export const getMockGroup = (id: string): GroupDetailApi => {
  const group = groups.get(id);
  if (!group) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
  return group;
};

export const GroupApi: typeof GroupApiContract = {
  list: (params): Promise<ListGroupApiResponse> => {
    const types = { NORMAL_GROUP: 1, ADVANCED_GROUP: 2, MARKET_GROUP: 3 };
    const rows = [...groups.values()]
      .filter((group) => !params.groupType || group.groupType === types[params.groupType])
      .filter((group) => params.groupRoleFilter !== 'MANAGED' || roles.get(group.groupId) !== 2)
      .map(toGroupItem);
    return mockResponse(mockPage(rows, params));
  },
  getGroupBaseInfo: ({ groupId }): Promise<GetGroupBaseInfoApiResponse> =>
    mockResponse(toGroupItem(getMockGroup(groupId))),
  getGroupDetailInfo: ({ groupId }): Promise<GetGroupDetailInfoApiResponse> =>
    mockResponse(getMockGroup(groupId)),
  addGroup: async (params): Promise<AddGroupApiResponse> => {
    const groupId = String(BigInt(Date.now()) + BigInt(groups.size));
    groups.set(groupId, {
      ...params,
      groupId,
      groupCoverUrl: params.groupCoverUrl ?? '',
      groupMetaInfo: params.groupMetaInfo ?? null,
      ownerId: '1',
      ownerInfo: normalizeUserDisplay({
        nickname: '示例用户',
        username: 'mock-user',
        identityType: 2,
      }),
      memberCount: 1,
      createTime: Date.now(),
      inviteCode: `MOCK-${groupId}`,
      tokenUsed: 0,
      tokenBalance: 1000,
    });
    roles.set(groupId, 0);
    members.set(groupId, []);
    return groupId;
  },
  changeGroup: async (params): Promise<ChangeGroupApiResponse> => {
    Object.assign(getMockGroup(params.groupId), params);
    return null;
  },
  removeGroup: async ({ groupId }): Promise<RemoveGroupApiResponse> => {
    groups.delete(groupId);
    members.delete(groupId);
    roles.delete(groupId);
    configs.delete(groupId);
    return null;
  },
  joinGroup: async (): Promise<JoinGroupApiResponse> => null,
};

export const GroupResConfigApi: typeof GroupResConfigApiContract = {
  getConfig: ({ groupId }): Promise<GetGroupConfigApiResponse> =>
    mockResponse(
      configs.get(groupId) ?? {
        groupId,
        fileOrgLogic: 'FOLDER',
        defaultMemberActions: ['DISCOVER', 'VIEW', 'DOWNLOAD_WATERMARK'],
      }
    ),
  changeConfig: async (params): Promise<ChangeGroupConfigApiResponse> => {
    configs.set(params.groupId, {
      groupId: params.groupId,
      fileOrgLogic: params.fileOrgLogic,
      defaultMemberActions: params.defaultMemberActions ??
        configs.get(params.groupId)?.defaultMemberActions ?? [
          'DISCOVER',
          'VIEW',
          'DOWNLOAD_WATERMARK',
        ],
    });
    return null;
  },
};

const createMockMemberInfo = (group: GroupDetailApi): GroupMemberDetailApi => {
  const member = members.get(group.groupId)?.[0];
  if (!member) {
    return {
      role: 0,
      joinTime: group.createTime ?? Date.now(),
      tokenLimit: group.tokenBalance,
      tokenUsed: group.tokenUsed,
      groupId: group.groupId,
      memberId: group.ownerId,
      memberInfo: group.ownerInfo,
    };
  }
  return member;
};

export const GroupMemberApi: typeof GroupMemberApiContract = {
  list: ({ groupId, page, size }): Promise<ListGroupMemberApiResponse> =>
    mockResponse(mockPage(members.get(groupId) ?? [], { page, size })),
  getMyRole: (groupId): Promise<GetMyRoleInGroupApiResponse> =>
    mockResponse(roles.get(groupId) ?? -1),
  quit: async ({ groupId }): Promise<QuitGroupApiResponse> => {
    roles.delete(groupId);
    return null;
  },
  changeRole: async ({
    groupId,
    targetUserIds,
    role,
  }): Promise<ChangeGroupMemberRoleApiResponse> => {
    for (const member of members.get(groupId) ?? []) {
      if (targetUserIds.includes(member.memberId)) member.role = role;
    }
    return null;
  },
  kick: async ({ groupId, targetUserIds }): Promise<KickGroupMembersApiResponse> => {
    members.set(
      groupId,
      (members.get(groupId) ?? []).filter((member) => !targetUserIds.includes(member.memberId))
    );
    return null;
  },
  getMyGroupMemberInfo: ({ groupId }): Promise<GetMyGroupMemberInfoApiResponse> =>
    mockResponse(createMockMemberInfo(getMockGroup(groupId))),
  changeTokenLimit: async ({
    groupId,
    targetUserIds,
    newTokenLimit,
  }): Promise<ChangeGroupMemberTokenLimitApiResponse> => {
    for (const member of members.get(groupId) ?? []) {
      if (targetUserIds.includes(member.memberId)) member.tokenLimit = newTokenLimit;
    }
    return null;
  },
  getAllMyGroupTokenInfo: ({ page, size }): Promise<GetAllMyGroupTokenInfoApiResponse> =>
    mockResponse(
      mockPage(
        [...groups.values()].map((group) => ({
          groupDisplayBase: {
            groupName: group.groupName,
            groupType: group.groupType,
          },
          tokenLimit: 1000,
          tokenUsed: 100,
        })),
        { page, size }
      )
    ),
};
