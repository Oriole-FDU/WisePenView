import type {
  CreateGroupRequest,
  EditGroupRequest,
  GetGroupWalletInfoRequest,
  Group,
  GroupBaseInfo,
  GroupMember,
  GroupMemberList,
  GroupResConfig,
  IGroupService,
} from '@/domains/Group';
import { DEFAULT_MEMBER_ACTIONS, GROUP_FILE_ORG_LOGIC } from '@/domains/Group';
import { findMockGroup, getMockGroups, removeMockGroup, upsertMockGroup } from './groupStore.mock';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const groups = getMockGroups();
const members = (mockdata.members as GroupMember[]).map((member) => ({
  ...member,
  email: member.email ?? `member-${member.userId}@example.invalid`,
}));
const myRole = mockdata.myRole as 'OWNER' | 'ADMIN' | 'MEMBER';

const pickGroupBaseInfo = (group: Group): GroupBaseInfo => ({
  groupId: group.groupId,
  groupName: group.groupName,
  groupDesc: group.groupDesc,
  groupCoverUrl: group.groupCoverUrl,
  groupMetaInfo: group.groupMetaInfo,
  groupType: group.groupType,
});

const fetchGroupList = async (): Promise<{ groups: Group[]; total: number }> => {
  await delay(200);
  return { groups, total: groups.length };
};

const fetchAllMyGroups = async (): Promise<Group[]> => {
  await delay(200);
  return groups;
};

const fetchGroupBaseInfo = async (groupId: string): Promise<GroupBaseInfo> => {
  await delay(100);
  const group = findMockGroup(groupId);
  if (group) return pickGroupBaseInfo(structuredClone(group));
  return {
    groupId,
    groupName: '',
    groupDesc: '',
    groupCoverUrl: '',
    groupMetaInfo: {},
    groupType: 0,
  };
};

const fetchGroupInfo = async (groupId: string): Promise<Group> => {
  await delay(200);
  const group = findMockGroup(groupId);
  if (group) return structuredClone(group);
  return {
    groupId,
    groupName: '',
    groupDesc: '',
    groupCoverUrl: '',
    groupMetaInfo: {},
    groupType: 0,
    memberCount: 0,
  };
};

const getGroupWalletInfo = async (_params: GetGroupWalletInfoRequest): Promise<number> => {
  await delay(100);
  return 1000;
};

const fetchGroupResConfig = async (groupId: string): Promise<GroupResConfig> => {
  await delay(100);
  return {
    groupId,
    fileOrgLogic: GROUP_FILE_ORG_LOGIC.TAG,
    defaultMemberActions: DEFAULT_MEMBER_ACTIONS,
  };
};

const updateGroupResConfig = async (): Promise<void> => {
  await delay(200);
};

const createGroup = async (params: CreateGroupRequest): Promise<string> => {
  await delay(200);
  const groupId = `mock-group-${Date.now()}`;
  upsertMockGroup({
    groupId,
    groupName: params.groupName,
    groupDesc: params.groupDesc,
    groupCoverUrl: params.groupCoverUrl ?? '',
    groupMetaInfo: params.groupMetaInfo ?? {},
    groupType: params.groupType,
    ownerId: 'current-user',
    ownerInfo: { nickname: 'only317', realName: 'only317', identityType: 2 },
    memberCount: 1,
    createTime: new Date().toISOString(),
    inviteCode: 'MOCK01',
  });
  return groupId;
};

const editGroup = async (params: EditGroupRequest): Promise<void> => {
  await delay(200);
  const current = findMockGroup(params.groupId);
  if (!current) return;
  upsertMockGroup({
    ...current,
    groupName: params.groupName,
    groupDesc: params.groupDesc,
    groupCoverUrl: params.groupCoverUrl,
    groupMetaInfo: params.groupMetaInfo ?? current.groupMetaInfo,
    groupType: params.groupType,
  });
};

const deleteGroup: IGroupService['deleteGroup'] = async ({ groupId }): Promise<void> => {
  await delay(200);
  removeMockGroup(groupId);
};

const fetchGroupMembers = async (
  _groupId: string | number,
  page: number,
  size: number
): Promise<GroupMemberList> => {
  await delay(200);
  const start = Math.max(0, (page - 1) * size);
  const end = start + size;
  return { members: members.slice(start, end), total: members.length };
};

const fetchMyRoleInGroup = async (_groupId: string): Promise<'OWNER' | 'ADMIN' | 'MEMBER'> => {
  await delay(100);
  return myRole;
};

const joinGroup = async (): Promise<void> => {
  await delay(200);
};

const quitGroup = async (): Promise<void> => {
  await delay(200);
};

const updateMemberRole = async (): Promise<void> => {
  await delay(200);
};

const kickMembers = async (): Promise<void> => {
  await delay(200);
};

export const GroupServicesMock: IGroupService = {
  fetchGroupList,
  fetchAllMyGroups,
  fetchGroupBaseInfo,
  fetchGroupInfo,
  getGroupWalletInfo,
  fetchGroupResConfig,
  updateGroupResConfig,
  createGroup,
  editGroup,
  deleteGroup,
  fetchGroupMembers,
  fetchMyRoleInGroup,
  joinGroup,
  quitGroup,
  updateMemberRole,
  kickMembers,
};
