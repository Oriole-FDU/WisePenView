import { GroupApi, GroupMemberApi, GroupResConfigApi } from '@domain-apis';

import { normalizeResourceActions } from '@/domains/_shared/access';
import type { Group, GroupBaseInfo, GroupMemberList, GroupResConfig, ROLE } from '@/domains/Group';
import { DEFAULT_MEMBER_ACTIONS, GROUP_TYPE } from '@/domains/Group';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeId } from '@/utils/normalize/normalizeId';
import type { EnumKey } from '@/utils/type/enum';

import type { GroupQuotaInfo, UserGroupQuota } from '../entity/quota';
import { GroupQuotaMap } from '../mapper/groupQuota.mapper';
import { GroupServicesMap } from '../mapper/GroupServices.map';
import type {
  CreateGroupRequest,
  DeleteGroupRequest,
  EditGroupRequest,
  FetchGroupListRequest,
  FetchGroupListResponse,
  GetGroupWalletInfoRequest,
  IGroupService,
  JoinGroupRequest,
  KickMembersRequest,
  QuitGroupRequest,
  SetGroupQuotaRequest,
  UpdateGroupResConfigRequest,
  UpdateMemberRoleRequest,
} from './index.type';

const fetchGroupList = async (params: FetchGroupListRequest): Promise<FetchGroupListResponse> => {
  const query = GroupServicesMap.mapFetchGroupListRequest(params);
  const payload = await GroupApi.list(query);
  return GroupServicesMap.mapFetchGroupListFromApi(payload);
};

const fetchGroupInfo = async (groupId: string): Promise<Group> => {
  const myRole = await fetchMyRoleInGroup(groupId);
  const data = await (myRole === 'MEMBER'
    ? GroupApi.getGroupBaseInfo({ groupId })
    : GroupApi.getGroupDetailInfo({ groupId }));
  return GroupServicesMap.mapGroupFromApi(data);
};

const fetchGroupBaseInfo = async (groupId: string): Promise<GroupBaseInfo> => {
  const data = await GroupApi.getGroupBaseInfo({ groupId });
  return GroupServicesMap.mapFetchGroupBaseInfoFromApi(data);
};

const getGroupWalletInfo = async (params: GetGroupWalletInfoRequest): Promise<number> => {
  const { groupId } = params;
  if (!groupId) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ID_REQUIRED);
  const data = await GroupApi.getGroupDetailInfo({ groupId });
  return data.tokenBalance;
};

const fetchGroupResConfig = async (groupId: string): Promise<GroupResConfig> => {
  const data = await GroupResConfigApi.getConfig({ groupId });
  return GroupServicesMap.mapFetchGroupResConfigFromApi(data);
};

const updateGroupResConfig = async (params: UpdateGroupResConfigRequest) => {
  const payload = GroupServicesMap.mapUpdateGroupResConfigRequest(params);
  await GroupResConfigApi.changeConfig(payload);
};

const createGroup = async (params: CreateGroupRequest): Promise<string> => {
  const groupId = await GroupApi.addGroup(GroupServicesMap.mapCreateGroupRequest(params));
  const currentConfig = await GroupResConfigApi.getConfig({ groupId });
  await updateGroupResConfig({
    groupId,
    fileOrgLogic: currentConfig.fileOrgLogic,
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
  const data = await GroupMemberApi.list({ groupId: normalizeId(groupId), page, size });
  return GroupServicesMap.mapFetchGroupMembersFromApi(data);
};

const fetchMyRoleInGroup = async (groupId: string): Promise<EnumKey<typeof ROLE>> => {
  const data = await GroupMemberApi.getMyRole(groupId);
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
  await GroupMemberApi.changeRole(params);
};

const kickMembers = async (params: KickMembersRequest) => {
  await GroupMemberApi.kick(params);
};

const normalizePage = (page: number): number => Math.max(1, Math.floor(page));
const normalizePageSize = (pageSize: number): number => Math.max(1, Math.floor(pageSize));

/** GET /group/member/getAllMyGroupTokenInfo → PageR<GroupMemberTokenDetailResponse> */
const fetchUserGroupQuotas = async (
  page: number,
  pageSize: number
): Promise<{ quotas: UserGroupQuota[]; total: number }> => {
  const data = await GroupMemberApi.getAllMyGroupTokenInfo({
    page: normalizePage(page),
    size: normalizePageSize(pageSize),
  });
  const mapped = GroupQuotaMap.mapFetchUserGroupQuotasFromApi(data);

  return {
    quotas: mapped.quotas.filter((quota) => quota.groupType === GROUP_TYPE.ADVANCED),
    total: mapped.total,
  };
};

const fetchGroupQuota = async (groupId: string | number): Promise<GroupQuotaInfo> => {
  const data = await GroupMemberApi.getMyGroupMemberInfo({ groupId: normalizeId(groupId) });
  return GroupQuotaMap.mapFetchGroupQuotaFromApi(data);
};

const setGroupQuota = async (params: SetGroupQuotaRequest) => {
  await GroupMemberApi.changeTokenLimit(params);
};

export const createGroupServices = (): IGroupService => ({
  fetchGroupList,
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
  fetchUserGroupQuotas,
  fetchGroupQuota,
  setGroupQuota,
});
