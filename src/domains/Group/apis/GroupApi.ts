import { apiGet, apiPost } from '@/apis/request';

import type {
  AddGroupApiRequest,
  AddGroupApiResponse,
  ChangeGroupApiRequest,
  ChangeGroupConfigApiRequest,
  ChangeRoleApiRequest,
  ChangeTokenLimitApiRequest,
  FetchGroupMembersApiResponse,
  GetAllMyGroupTokenInfoApiRequest,
  GetAllMyGroupTokenInfoApiResponse,
  GetGroupBaseInfoApiRequest,
  GetGroupBaseInfoApiResponse,
  GetGroupConfigApiRequest,
  GetGroupConfigApiResponse,
  GetGroupInfoApiRequest,
  GetGroupInfoApiResponse,
  GetMyGroupMemberInfoApiRequest,
  GetMyGroupMemberInfoApiResponse,
  GroupRoleApiResponse,
  JoinGroupApiRequest,
  KickMemberApiRequest,
  ListGroupApiRequest,
  ListGroupApiResponse,
  ListMemberApiRequest,
  QuitGroupApiRequest,
  RemoveGroupApiRequest,
} from './GroupApi.type';

/** Group API: /group/* */
function listGroups(req: ListGroupApiRequest): Promise<ListGroupApiResponse> {
  return apiGet('/group/list', { params: req });
}

function getGroupDetailInfo(req: GetGroupInfoApiRequest): Promise<GetGroupInfoApiResponse> {
  return apiGet('/group/getGroupDetailInfo', { params: req });
}

function getGroupBaseInfo(req: GetGroupBaseInfoApiRequest): Promise<GetGroupBaseInfoApiResponse> {
  return apiGet('/group/getGroupBaseInfo', { params: req });
}

function addGroup(req: AddGroupApiRequest): Promise<AddGroupApiResponse> {
  return apiPost('/group/addGroup', req);
}

function changeGroup(req: ChangeGroupApiRequest): Promise<void> {
  return apiPost('/group/changeGroup', req);
}

function removeGroup(req: RemoveGroupApiRequest): Promise<void> {
  return apiPost('/group/removeGroup', req);
}

function joinGroup(req: JoinGroupApiRequest): Promise<void> {
  return apiPost('/group/joinGroup', req);
}

export const GroupApi = {
  list: listGroups,
  getGroupDetailInfo,
  getGroupBaseInfo,
  addGroup,
  changeGroup,
  removeGroup,
  joinGroup,
};

/** Group Config API: /resource/groupConfig/* */

function getConfig(req: GetGroupConfigApiRequest): Promise<GetGroupConfigApiResponse> {
  return apiGet('/resource/groupConfig/getConfig', { params: req });
}

function changeConfig(req: ChangeGroupConfigApiRequest): Promise<void> {
  return apiPost('/resource/groupConfig/changeConfig', req);
}

export const GroupResConfigApi = {
  getConfig,
  changeConfig,
};

/** Group Member API: /group/member/* */

function listMembers(req: ListMemberApiRequest): Promise<FetchGroupMembersApiResponse> {
  return apiGet('/group/member/list', { params: req });
}

function getMyRole(groupId: string): Promise<GroupRoleApiResponse> {
  return apiGet('/group/member/getMyRole', { params: { groupId } });
}

function quit(req: QuitGroupApiRequest): Promise<void> {
  return apiPost('/group/member/quit', req);
}

function changeRole(req: ChangeRoleApiRequest): Promise<void> {
  return apiPost('/group/member/changeRole', req);
}

function kick(req: KickMemberApiRequest): Promise<void> {
  return apiPost('/group/member/kick', req);
}

function getMyGroupMemberInfo(
  req: GetMyGroupMemberInfoApiRequest
): Promise<GetMyGroupMemberInfoApiResponse> {
  return apiGet('/group/member/getMyGroupMemberInfo', { params: req });
}

function changeTokenLimit(req: ChangeTokenLimitApiRequest): Promise<void> {
  return apiPost('/group/member/changeTokenLimit', req);
}

function getAllMyGroupTokenInfo(
  req: GetAllMyGroupTokenInfoApiRequest
): Promise<GetAllMyGroupTokenInfoApiResponse> {
  return apiGet('/group/member/getAllMyGroupTokenInfo', { params: req });
}

export const GroupMemberApi = {
  list: listMembers,
  getMyRole,
  quit,
  changeRole,
  kick,
  getMyGroupMemberInfo,
  changeTokenLimit,
  getAllMyGroupTokenInfo,
};
