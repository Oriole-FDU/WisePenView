import { mockPage, mockResponse } from '@/domains/_shared/mock/response';
import { createMockUserDisplay } from '@/domains/_shared/mock/userDisplay';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  GroupApi as GroupApiContract,
  GroupMemberApi as GroupMemberApiContract,
  GroupResConfigApi as GroupResConfigApiContract,
} from '../apis/GroupApi';
import type {
  GetGroupConfigApiResponse,
  GroupApiResponse,
  GroupDetailApiResponse,
  GroupMemberApiResponse,
  GroupRoleApiResponse,
} from '../apis/GroupApi.type';
import mockdata from './mockdata.json';

const normalizeLong = (value: string | number | null | undefined): string | undefined => {
  if (value == null) return undefined;
  return value.toString();
};

const normalizeGroupType = (value: number | string): NonNullable<GroupApiResponse['groupType']> => {
  if (value === 2 || value === '2') return 'ADVANCED_GROUP';
  if (value === 3 || value === '3') return 'MARKET_GROUP';
  return 'NORMAL_GROUP';
};

const normalizeIdentityType = (
  value: number | string
): NonNullable<NonNullable<GroupApiResponse['ownerInfo']>['identityType']> => {
  if (value === 2 || value === '2') return 'TEACHER';
  if (value === 3 || value === '3') return 'ADMIN';
  return 'STUDENT';
};

const normalizeGroupRole = (value: number | string): GroupRoleApiResponse => {
  if (value === 0 || value === '0') return 'OWNER';
  if (value === 1 || value === '1') return 'ADMIN';
  if (value === 2 || value === '2') return 'MEMBER';
  return 'NOT_MEMBER';
};

const normalizeGroup = (group: (typeof mockdata.groups)[number]): GroupDetailApiResponse => ({
  ...group,
  groupType: normalizeGroupType(group.groupType),
  ownerInfo: group.ownerInfo
    ? createMockUserDisplay({
        ...group.ownerInfo,
        identityType: normalizeIdentityType(group.ownerInfo.identityType),
      })
    : group.ownerInfo,
  memberCount: Number(group.memberCount ?? 0),
  createTime: Date.parse(group.createTime ?? '2026-01-01T00:00:00Z'),
  inviteCode: normalizeLong(group.inviteCode) ?? '',
  tokenUsed: Number(group.tokenUsed ?? 0),
  tokenBalance: Number(group.tokenBalance ?? 0),
});

const normalizeMember = (
  member: (typeof mockdata.members)[keyof typeof mockdata.members][number]
): GroupMemberApiResponse => ({
  ...member,
  role: normalizeGroupRole(member.role),
  joinTime: Date.parse(member.joinTime),
  memberInfo: {
    ...member.memberInfo,
    identityType: normalizeIdentityType(member.memberInfo.identityType),
  },
  tokenLimit: Number(member.tokenLimit ?? 0),
  tokenUsed: Number(member.tokenUsed ?? 0),
});

const groups = new Map<string, GroupDetailApiResponse>(
  mockdata.groups.map((g) => [g.groupId, normalizeGroup(g)])
);
const members = new Map<string, GroupMemberApiResponse[]>(
  Object.entries(mockdata.members).map(([groupId, groupMembers]) => [
    groupId,
    groupMembers.map(normalizeMember),
  ])
);
const roles = new Map<string, GroupRoleApiResponse>(
  Object.entries(mockdata.myRoles).map(([groupId, role]) => [groupId, normalizeGroupRole(role)])
);
const configs = new Map<string, GetGroupConfigApiResponse>();
export const getMockGroup = (id: string): GroupDetailApiResponse => {
  const group = groups.get(id);
  if (!group) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
  return group;
};

export const GroupApi: typeof GroupApiContract = {
  list: (params) => {
    const rows = [...groups.values()].filter(
      (g) => !params.groupType || g.groupType === params.groupType
    );
    return mockResponse(
      mockPage(
        rows.filter(
          (g) => params.groupRoleFilter !== 'MANAGED' || roles.get(String(g.groupId)) !== 'MEMBER'
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
      groupDesc: params.groupDesc,
      groupCoverUrl: params.groupCoverUrl ?? null,
      groupMetaInfo: params.groupMetaInfo ?? null,
      ownerId: '1',
      ownerInfo: createMockUserDisplay({
        nickname: '示例用户',
        identityType: 'TEACHER',
      }),
      memberCount: 1,
      inviteCode: `MOCK${crypto.randomUUID().slice(0, 8)}`,
      tokenUsed: 0,
      tokenBalance: 1000,
      createTime: Date.now(),
    });
    roles.set(groupId, 'OWNER');
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
    configs.set(params.groupId, {
      ...structuredClone(params),
      defaultMemberActions: params.defaultMemberActions ?? [],
    });
  },
};

export const GroupMemberApi: typeof GroupMemberApiContract = {
  list: (params) => mockResponse(mockPage(members.get(String(params.groupId)) ?? [], params)),
  getMyRole: (groupId) => mockResponse(roles.get(groupId) ?? 'NOT_MEMBER'),
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
      joinTime: Date.now(),
      tokenUsed: 100,
      tokenLimit: 1000,
      role: roles.get(String(groupId)) ?? 'NOT_MEMBER',
      memberId: '1',
      memberInfo: {
        nickname: '示例用户',
        realName: null,
        avatar: null,
        identityType: 'STUDENT',
        campusNo: null,
        email: null,
        mobile: null,
      },
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
          groupId: g.groupId,
          groupDisplayBase: {
            groupName: g.groupName,
            groupType: g.groupType,
          },
          tokenLimit: 1000,
          tokenUsed: 100,
        })),
        params
      )
    ),
};
