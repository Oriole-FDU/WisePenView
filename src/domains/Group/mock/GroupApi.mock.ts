import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  GroupApi as GroupApiContract,
  GroupMemberApi as GroupMemberApiContract,
  GroupResConfigApi as GroupResConfigApiContract,
} from '../apis/GroupApi';
import type {
  GetGroupConfigApiResponse,
  GroupApiResponse,
  GroupMemberApiResponse,
  GroupRoleApiResponse,
  GroupTypeApiValue,
} from '../apis/GroupApi.type';
import mockdata from './mockdata.json';

const normalizeLong = (value: string | number | null | undefined): string | undefined => {
  if (value == null) return undefined;
  return value.toString();
};

const normalizeGroupType = (value: number): GroupTypeApiValue => {
  if (value === 1 || value === 2 || value === 3) return value;
  throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
};

const normalizeGroup = (group: (typeof mockdata.groups)[number]): GroupApiResponse => ({
  ...group,
  groupType: normalizeGroupType(group.groupType),
  ownerInfo: group.ownerInfo
    ? {
        ...group.ownerInfo,
        identityType: group.ownerInfo.identityType as NonNullable<
          GroupApiResponse['ownerInfo']
        >['identityType'],
      }
    : group.ownerInfo,
  memberCount: normalizeLong(group.memberCount),
  tokenUsed: normalizeLong(group.tokenUsed),
  tokenBalance: normalizeLong(group.tokenBalance),
});

const normalizeMember = (
  member: (typeof mockdata.members)[keyof typeof mockdata.members][number]
): GroupMemberApiResponse => ({
  ...member,
  role: member.role as GroupMemberApiResponse['role'],
  memberInfo: {
    ...member.memberInfo,
    identityType: member.memberInfo
      .identityType as GroupMemberApiResponse['memberInfo']['identityType'],
  },
  tokenLimit: normalizeLong(member.tokenLimit) ?? '0',
  tokenUsed: normalizeLong(member.tokenUsed) ?? '0',
});

const groups = new Map<string, GroupApiResponse>(
  mockdata.groups.map((g) => [g.groupId, normalizeGroup(g)])
);
const members = new Map<string, GroupMemberApiResponse[]>(
  Object.entries(mockdata.members).map(([groupId, groupMembers]) => [
    groupId,
    groupMembers.map(normalizeMember),
  ])
);
const roles = new Map<string, GroupRoleApiResponse>(
  Object.entries(mockdata.myRoles) as [string, GroupRoleApiResponse][]
);
const configs = new Map<string, GetGroupConfigApiResponse>();
export const getMockGroup = (id: string): GroupApiResponse => {
  const group = groups.get(id);
  if (!group) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
  return group;
};

export const GroupApi: typeof GroupApiContract = {
  list: (params) => {
    const types = { NORMAL_GROUP: 1, ADVANCED_GROUP: 2, MARKET_GROUP: 3 };
    const rows = [...groups.values()].filter(
      (g) => !params.groupType || Number(g.groupType) === types[params.groupType]
    );
    return mockResponse(
      mockPage(
        rows.filter(
          (g) => params.groupRoleFilter !== 'MANAGED' || roles.get(String(g.groupId)) !== '2'
        ),
        params
      )
    );
  },
  getGroupBaseInfo: ({ groupId }) => mockResponse(getMockGroup(groupId)),
  getGroupDetailInfo: ({ groupId }) => mockResponse(getMockGroup(groupId)),
  addGroup: async (params) => {
    const groupId = `mock-group-${crypto.randomUUID()}`;
    groups.set(groupId, {
      ...params,
      groupId,
      groupType: params.groupType,
      ownerId: '1',
      ownerInfo: { nickname: '示例用户', identityType: 2 },
      memberCount: '1',
      tokenBalance: '1000',
    });
    roles.set(groupId, '0');
    members.set(groupId, []);
    return groupId;
  },
  changeGroup: async (params) => {
    Object.assign(getMockGroup(params.groupId), params);
  },
  removeGroup: async ({ groupId }) => {
    groups.delete(groupId);
    members.delete(groupId);
    roles.delete(groupId);
    configs.delete(groupId);
  },
  joinGroup: async () => undefined,
};

export const GroupResConfigApi: typeof GroupResConfigApiContract = {
  getConfig: ({ groupId }) =>
    mockResponse(
      configs.get(groupId) ?? {
        groupId,
        fileOrgLogic: 'TAG',
        defaultMemberActions: ['DISCOVER', 'VIEW', 'LOAD'],
      }
    ),
  changeConfig: async (params) => {
    configs.set(params.groupId, structuredClone(params));
  },
};

export const GroupMemberApi: typeof GroupMemberApiContract = {
  list: (params) => mockResponse(mockPage(members.get(String(params.groupId)) ?? [], params)),
  getMyRole: (groupId) => mockResponse(roles.get(groupId) ?? '-1'),
  quit: async ({ groupId }) => {
    roles.delete(groupId);
  },
  changeRole: async ({ groupId, targetUserIds, role }) => {
    for (const member of members.get(groupId) ?? []) {
      if (targetUserIds.includes(String(member.memberId)))
        member.role = role as GroupRoleApiResponse;
    }
  },
  kick: async ({ groupId, targetUserIds }) => {
    members.set(
      groupId,
      (members.get(groupId) ?? []).filter((m) => !targetUserIds.includes(String(m.memberId)))
    );
  },
  getMyGroupMemberInfo: ({ groupId }) =>
    mockResponse({
      groupId,
      tokenUsed: '100',
      tokenLimit: '1000',
      role: roles.get(String(groupId)) ?? '-1',
    }),
  changeTokenLimit: async ({ groupId, targetUserIds, newTokenLimit }) => {
    for (const member of members.get(groupId) ?? []) {
      if (targetUserIds.includes(String(member.memberId)))
        member.tokenLimit = newTokenLimit.toString();
    }
  },
  getAllMyGroupTokenInfo: (params) =>
    mockResponse(
      mockPage(
        [...groups.values()].map((g) => ({
          groupDisplayBase: {
            groupId: g.groupId ?? '',
            groupName: g.groupName ?? '',
            groupType: g.groupType,
          },
          tokenLimit: '1000',
          tokenUsed: '100',
        })),
        params
      )
    ),
};
