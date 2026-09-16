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
} from '../apis/GroupApi.type';
import mockdata from './mockdata.json';

const groups = new Map<string, GroupApiResponse>(
  mockdata.groups.map((g) => [g.groupId, g as GroupApiResponse])
);
const members = new Map<string, GroupMemberApiResponse[]>(
  Object.entries(mockdata.members) as [string, GroupMemberApiResponse[]][]
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
      groupType: Number(params.groupType) as 1 | 2 | 3,
      ownerId: '1',
      ownerInfo: { nickname: '示例用户', identityType: 2 },
      memberCount: 1,
      tokenBalance: 1000,
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
      tokenUsed: 100,
      tokenLimit: 1000,
      role: roles.get(String(groupId)) ?? '-1',
    }),
  changeTokenLimit: async ({ groupId, targetUserIds, newTokenLimit }) => {
    for (const member of members.get(groupId) ?? []) {
      if (targetUserIds.includes(String(member.memberId))) member.tokenLimit = newTokenLimit;
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
          tokenLimit: 1000,
          tokenUsed: 100,
        })),
        params
      )
    ),
};
