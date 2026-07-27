import type {
  GetGroupWalletInfoRequest,
  Group,
  GroupBaseInfo,
  GroupMember,
  GroupMemberList,
  GroupResConfig,
  IGroupService,
} from '@/domains/Group';
import { DEFAULT_MEMBER_ACTIONS, GROUP_FILE_ORG_LOGIC } from '@/domains/Group';
import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const groups = mockdata.groups as Group[];
const groupDetail = mockdata.groupDetail as Group;
const members = mockdata.members as GroupMember[];
const myRole = mockdata.myRole as 'OWNER' | 'ADMIN' | 'MEMBER';

const pickGroupBaseInfo = (group: Group): GroupBaseInfo => ({
  groupId: group.groupId,
  groupName: group.groupName,
  groupDesc: group.groupDesc,
  groupCoverUrl: group.groupCoverUrl,
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
  const group = groups.find((item) => item.groupId === groupId) ?? groupDetail;
  return pickGroupBaseInfo(
    group.groupId === groupId ? group : { ...group, groupId, groupName: '' }
  );
};

const fetchGroupInfo = async (_groupId: string): Promise<Group> => {
  await delay(200);
  return groupDetail;
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

const createGroup = async (): Promise<string> => {
  await delay(200);
  return 'mock-new-group-id';
};

const editGroup = async (): Promise<void> => {
  await delay(200);
};

const deleteGroup = async (): Promise<void> => {
  await delay(200);
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
