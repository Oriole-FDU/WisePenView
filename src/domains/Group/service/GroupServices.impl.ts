import type { Group, GroupBaseInfo, GroupMemberList, GroupResConfig, ROLE } from '@/domains/Group';
import { DEFAULT_MEMBER_ACTIONS } from '@/domains/Group';
import { normalizeResourceActions } from '@/domains/Tag';
import type { EnumKey } from '@/utils/enum';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { GroupApi, GroupMemberApi, GroupResConfigApi } from '../apis/GroupApi';
import { GroupServicesMap } from '../mapper/GroupServices.map';
import type {
  CreateGroupRequest,
  DeleteGroupRequest,
  EditGroupRequest,
  FetchGroupListRequest,
  GetGroupWalletInfoRequest,
  IGroupService,
  JoinGroupRequest,
  KickMembersRequest,
  QuitGroupRequest,
  UpdateGroupResConfigRequest,
  UpdateMemberRoleRequest,
} from './index.type';

const ALL_GROUPS_PAGE_SIZE = 100;

const fetchGroupList = async (
  params: FetchGroupListRequest
): Promise<{ groups: Group[]; total: number }> => {
  const query = GroupServicesMap.mapFetchGroupListRequest(params);
  const payload = await GroupApi.list(query);
  return GroupServicesMap.mapFetchGroupListFromApi(payload);
};

const fetchAllMyGroups = async (): Promise<Group[]> => {
  const groups: Group[] = [];
  let page = 1;

  while (true) {
    const data = await fetchGroupList({
      groupRoleFilter: 'ALL',
      page,
      size: ALL_GROUPS_PAGE_SIZE,
    });
    groups.push(...data.groups);

    if (
      data.groups.length < ALL_GROUPS_PAGE_SIZE ||
      (data.total > 0 && groups.length >= data.total)
    ) {
      return groups;
    }
    page += 1;
  }
};

const fetchGroupInfo = async (groupId: string): Promise<Group> => {
  const myRole = await fetchMyRoleInGroup(groupId);
  const query = GroupServicesMap.mapFetchGroupInfoRequest(groupId);
  const data = await (myRole === 'MEMBER'
    ? GroupApi.getGroupBaseInfo(query)
    : GroupApi.getGroupDetailInfo(query));
  if (!data) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
  return GroupServicesMap.mapFetchGroupInfoFromApi(data);
};

const fetchGroupBaseInfo = async (groupId: string): Promise<GroupBaseInfo> => {
  const query = GroupServicesMap.mapFetchGroupBaseInfoRequest(groupId);
  const data = await GroupApi.getGroupBaseInfo(query);
  if (!data) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
  return GroupServicesMap.mapFetchGroupBaseInfoFromApi(data, groupId);
};

const getGroupWalletInfo = async (params: GetGroupWalletInfoRequest): Promise<number> => {
  const { groupId } = params;
  if (!groupId) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ID_REQUIRED);
  const data = await GroupApi.getGroupDetailInfo({ groupId });
  if (!data) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_WALLET_FETCH_FAILED);
  return GroupServicesMap.mapGroupWalletInfoFromApi(data);
};

const fetchGroupResConfig = async (groupId: string): Promise<GroupResConfig> => {
  const query = GroupServicesMap.mapFetchGroupResConfigRequest(groupId);
  const data = await GroupResConfigApi.getConfig(query);
  if (!data) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_RES_CONFIG_FETCH_FAILED);
  return GroupServicesMap.mapFetchGroupResConfigFromApi(data);
};

const updateGroupResConfig = async (params: UpdateGroupResConfigRequest) => {
  const payload = GroupServicesMap.mapUpdateGroupResConfigRequest(params);
  await GroupResConfigApi.changeConfig(payload);
};

const createGroup = async (params: CreateGroupRequest): Promise<string> => {
  const payload = await GroupApi.addGroup(GroupServicesMap.mapCreateGroupRequest(params));
  if (payload == null) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_CREATE_FAILED);
  }
  const groupId = GroupServicesMap.mapCreateGroupFromApi(payload);
  if (!groupId) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_CREATE_FAILED);
  }
  await updateGroupResConfig({
    groupId,
    defaultMemberActions: normalizeResourceActions(DEFAULT_MEMBER_ACTIONS),
  });
  return groupId;
};

const editGroup = async (params: EditGroupRequest) => {
  await GroupApi.changeGroup(GroupServicesMap.mapEditGroupRequest(params));
};

const deleteGroup = async (params: DeleteGroupRequest) => {
  await GroupApi.removeGroup(params);
};

const fetchGroupMembers = async (
  groupId: string | number,
  page: number,
  size: number
): Promise<GroupMemberList> => {
  const query = GroupServicesMap.mapFetchGroupMembersRequest(groupId, page, size);
  const data = await GroupMemberApi.list(query);
  if (!data) {
    return { members: [], total: 0 };
  }
  return GroupServicesMap.mapFetchGroupMembersFromApi(data);
};

const fetchMyRoleInGroup = async (groupId: string): Promise<EnumKey<typeof ROLE>> => {
  const query = GroupServicesMap.mapFetchMyRoleInGroupRequest(groupId);
  const data = await GroupMemberApi.getMyRole(query);
  const role = GroupServicesMap.mapFetchMyRoleInGroupFromApi(data);
  if (!role) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ROLE_FETCH_FAILED);
  }
  return role;
};

const joinGroup = async (params: JoinGroupRequest) => {
  await GroupApi.joinGroup(params);
};

const quitGroup = async (params: QuitGroupRequest) => {
  await GroupMemberApi.quit(params);
};

const updateMemberRole = async (params: UpdateMemberRoleRequest) => {
  await GroupMemberApi.changeRole(GroupServicesMap.mapUpdateMemberRoleRequest(params));
};

const kickMembers = async (params: KickMembersRequest) => {
  await GroupMemberApi.kick(params);
};

export const createGroupServices = (): IGroupService => ({
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
});
