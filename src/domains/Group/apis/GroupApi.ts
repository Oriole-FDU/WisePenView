import { executeApiContract } from '@/apis/executeApiContract';

import {
  AddGroupApiContract,
  type AddGroupApiRequest,
  type AddGroupApiResponse,
  ChangeGroupApiContract,
  type ChangeGroupApiRequest,
  type ChangeGroupApiResponse,
  ChangeGroupConfigApiContract,
  type ChangeGroupConfigApiRequest,
  type ChangeGroupConfigApiResponse,
  ChangeGroupMemberRoleApiContract,
  type ChangeGroupMemberRoleApiRequest,
  type ChangeGroupMemberRoleApiResponse,
  ChangeGroupMemberTokenLimitApiContract,
  type ChangeGroupMemberTokenLimitApiRequest,
  type ChangeGroupMemberTokenLimitApiResponse,
  GetAllMyGroupTokenInfoApiContract,
  type GetAllMyGroupTokenInfoApiRequest,
  type GetAllMyGroupTokenInfoApiResponse,
  GetGroupBaseInfoApiContract,
  type GetGroupBaseInfoApiRequest,
  type GetGroupBaseInfoApiResponse,
  GetGroupConfigApiContract,
  type GetGroupConfigApiRequest,
  type GetGroupConfigApiResponse,
  GetGroupDetailInfoApiContract,
  type GetGroupDetailInfoApiRequest,
  type GetGroupDetailInfoApiResponse,
  GetMyGroupMemberInfoApiContract,
  type GetMyGroupMemberInfoApiRequest,
  type GetMyGroupMemberInfoApiResponse,
  GetMyRoleInGroupApiContract,
  type GetMyRoleInGroupApiResponse,
  JoinGroupApiContract,
  type JoinGroupApiRequest,
  type JoinGroupApiResponse,
  KickGroupMembersApiContract,
  type KickGroupMembersApiRequest,
  type KickGroupMembersApiResponse,
  ListGroupApiContract,
  type ListGroupApiRequest,
  type ListGroupApiResponse,
  ListGroupMemberApiContract,
  type ListGroupMemberApiRequest,
  type ListGroupMemberApiResponse,
  QuitGroupApiContract,
  type QuitGroupApiRequest,
  type QuitGroupApiResponse,
  RemoveGroupApiContract,
  type RemoveGroupApiRequest,
  type RemoveGroupApiResponse,
} from './GroupApi.contract';

/** Group API: /group/* */
async function listGroups(req: ListGroupApiRequest): Promise<ListGroupApiResponse> {
  return executeApiContract(ListGroupApiContract, req);
}

async function getGroupDetailInfo(
  req: GetGroupDetailInfoApiRequest
): Promise<GetGroupDetailInfoApiResponse> {
  return executeApiContract(GetGroupDetailInfoApiContract, req);
}

async function getGroupBaseInfo(
  req: GetGroupBaseInfoApiRequest
): Promise<GetGroupBaseInfoApiResponse> {
  return executeApiContract(GetGroupBaseInfoApiContract, req);
}

async function addGroup(req: AddGroupApiRequest): Promise<AddGroupApiResponse> {
  return executeApiContract(AddGroupApiContract, req);
}

async function changeGroup(req: ChangeGroupApiRequest): Promise<ChangeGroupApiResponse> {
  return executeApiContract(ChangeGroupApiContract, req);
}

async function removeGroup(req: RemoveGroupApiRequest): Promise<RemoveGroupApiResponse> {
  return executeApiContract(RemoveGroupApiContract, req);
}

async function joinGroup(req: JoinGroupApiRequest): Promise<JoinGroupApiResponse> {
  return executeApiContract(JoinGroupApiContract, req);
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

async function getConfig(req: GetGroupConfigApiRequest): Promise<GetGroupConfigApiResponse> {
  return executeApiContract(GetGroupConfigApiContract, req);
}

async function changeConfig(
  req: ChangeGroupConfigApiRequest
): Promise<ChangeGroupConfigApiResponse> {
  return executeApiContract(ChangeGroupConfigApiContract, req);
}

export const GroupResConfigApi = {
  getConfig,
  changeConfig,
};

/** Group Member API: /group/member/* */

async function listMembers(req: ListGroupMemberApiRequest): Promise<ListGroupMemberApiResponse> {
  return executeApiContract(ListGroupMemberApiContract, req);
}

async function getMyRole(groupId: string): Promise<GetMyRoleInGroupApiResponse> {
  return executeApiContract(GetMyRoleInGroupApiContract, { groupId });
}

async function quit(req: QuitGroupApiRequest): Promise<QuitGroupApiResponse> {
  return executeApiContract(QuitGroupApiContract, req);
}

async function changeRole(
  req: ChangeGroupMemberRoleApiRequest
): Promise<ChangeGroupMemberRoleApiResponse> {
  return executeApiContract(ChangeGroupMemberRoleApiContract, req);
}

async function kick(req: KickGroupMembersApiRequest): Promise<KickGroupMembersApiResponse> {
  return executeApiContract(KickGroupMembersApiContract, req);
}

async function getMyGroupMemberInfo(
  req: GetMyGroupMemberInfoApiRequest
): Promise<GetMyGroupMemberInfoApiResponse> {
  return executeApiContract(GetMyGroupMemberInfoApiContract, req);
}

async function changeTokenLimit(
  req: ChangeGroupMemberTokenLimitApiRequest
): Promise<ChangeGroupMemberTokenLimitApiResponse> {
  return executeApiContract(ChangeGroupMemberTokenLimitApiContract, req);
}

async function getAllMyGroupTokenInfo(
  req: GetAllMyGroupTokenInfoApiRequest
): Promise<GetAllMyGroupTokenInfoApiResponse> {
  return executeApiContract(GetAllMyGroupTokenInfoApiContract, req);
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
