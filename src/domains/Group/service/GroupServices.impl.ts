import type { Group, GroupFileOrgLogic, GroupMemberList, GroupResConfig } from '@/domains/Group';
import { GROUP_FILE_ORG_LOGIC, ROLE } from '@/domains/Group';
import {
  normalizeResourceActions,
  resourceActionsToApiKeys,
  TAG_RESOURCE_ACTION,
  type TagResourceAction,
} from '@/domains/Tag';
import type { EnumKey } from '@/utils/enum';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { GroupApi, GroupMemberApi, GroupResConfigApi } from '../apis/GroupApi';
import { mapGroupMemberRawResponse } from '../mapper/groupMember.mapper';
import type {
  CreateGroupRequest,
  DeleteGroupRequest,
  EditGroupRequest,
  FetchGroupListRequest,
  FetchGroupListResponse,
  FetchGroupMembersResponse,
  GetGroupWalletInfoRequest,
  IGroupService,
  JoinGroupRequest,
  KickMembersRequest,
  QuitGroupRequest,
  UpdateGroupResConfigRequest,
  UpdateMemberRoleRequest,
} from './index.type';

type GroupRaw = { groupId?: string | number } & Record<string, unknown>;

/** 将接口返回的 groupId 归一化为 string，避免 JSON 解析大数时精度丢失 */
const normalizeGroup = (g: GroupRaw): Group =>
  ({
    ...g,
    groupId: normalizeId(g.groupId),
    createTime: formatTimestampToDate((g as { createTime?: number | string | null }).createTime),
  }) as Group;

const isGroupFileOrgLogic = (v: unknown): v is GroupFileOrgLogic =>
  typeof v === 'string' && GROUP_FILE_ORG_LOGIC.getKey(v) != null;

const normalizeGroupFileOrgLogic = (v: unknown): GroupFileOrgLogic | undefined => {
  if (isGroupFileOrgLogic(v)) return v;
  const text = String(v ?? '').trim();
  if (!text) return undefined;
  if (text === '1') return GROUP_FILE_ORG_LOGIC.FOLDER;
  if (text === '2') return GROUP_FILE_ORG_LOGIC.TAG;
  const upperText = text.toUpperCase();
  return isGroupFileOrgLogic(upperText) ? upperText : undefined;
};

const normalizeTagResourceAction = (v: unknown): TagResourceAction | undefined => {
  if (typeof v === 'number' && TAG_RESOURCE_ACTION.getKey(v) != null) {
    return v as TagResourceAction;
  }
  const text = String(v ?? '').trim();
  if (!text) return undefined;
  const numericValue = Number(text);
  if (Number.isInteger(numericValue) && TAG_RESOURCE_ACTION.getKey(numericValue) != null) {
    return numericValue as TagResourceAction;
  }
  const action = TAG_RESOURCE_ACTION.options.find((item) => item.key === text.toUpperCase())?.value;
  return action != null && TAG_RESOURCE_ACTION.getKey(action) != null
    ? (action as TagResourceAction)
    : undefined;
};

const normalizeDefaultMemberActions = (actions?: unknown[]): TagResourceAction[] =>
  normalizeResourceActions(
    (actions ?? []).map(normalizeTagResourceAction).filter((v): v is TagResourceAction => v != null)
  );

const fetchGroupList = async (
  params: FetchGroupListRequest
): Promise<{ groups: Group[]; total: number }> => {
  const { groupRoleFilter, page, size } = params;
  const payload = (await GroupApi.list({ groupRoleFilter, page, size })) as FetchGroupListResponse;
  const list = (payload?.list ?? []) as unknown as GroupRaw[];
  return {
    groups: list.map(normalizeGroup),
    total: Number(payload?.total) || 0,
  };
};

const fetchGroupInfo = async (groupId: string): Promise<Group> => {
  const myRole = await fetchMyRoleInGroup(groupId);
  const data: Group | null = await (myRole === 'MEMBER'
    ? GroupApi.getGroupBaseInfo({ groupId })
    : GroupApi.getGroupDetailInfo({ groupId }));
  if (!data) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
  return normalizeGroup(data as unknown as GroupRaw);
};

const getGroupWalletInfo = async (params: GetGroupWalletInfoRequest): Promise<number> => {
  const { groupId } = params;
  if (!groupId) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ID_REQUIRED);
  const data = await GroupApi.getGroupDetailInfo({ groupId });
  if (!data) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_WALLET_FETCH_FAILED);
  return data.tokenBalance ?? 0;
};

const fetchGroupResConfig = async (groupId: string): Promise<GroupResConfig> => {
  const data = await GroupResConfigApi.getConfig({ groupId });
  if (!data) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_RES_CONFIG_FETCH_FAILED);
  const { fileOrgLogic, groupId: gid } = data;
  const normalizedFileOrgLogic = normalizeGroupFileOrgLogic(fileOrgLogic);
  if (!normalizedFileOrgLogic) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_RES_CONFIG_INVALID);
  }
  return {
    groupId: normalizeId(gid ?? groupId),
    fileOrgLogic: normalizedFileOrgLogic,
    defaultMemberActions: normalizeDefaultMemberActions(data.defaultMemberActions),
  };
};

const updateGroupResConfig = async (params: UpdateGroupResConfigRequest) => {
  await GroupResConfigApi.changeConfig({
    ...params,
    defaultMemberActions: resourceActionsToApiKeys(params.defaultMemberActions),
  });
};

const createGroup = async (params: CreateGroupRequest): Promise<string> => {
  const payload = await GroupApi.addGroup(params);
  if (payload == null) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_CREATE_FAILED);
  }
  const groupId = normalizeId(payload);
  if (!groupId) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_CREATE_FAILED);
  }
  return groupId;
};

const editGroup = async (params: EditGroupRequest) => {
  await GroupApi.changeGroup(params);
};

const deleteGroup = async (params: DeleteGroupRequest) => {
  await GroupApi.removeGroup(params);
};

const fetchGroupMembers = async (
  groupId: string | number,
  page: number,
  size: number
): Promise<GroupMemberList> => {
  const data = (await GroupMemberApi.list({
    groupId,
    page,
    size,
  })) as FetchGroupMembersResponse | null;
  if (!data) {
    return { members: [], total: 0 };
  }
  return {
    members: (data.list ?? []).map(mapGroupMemberRawResponse),
    total: Number(data.total) || 0,
  };
};

const fetchMyRoleInGroup = async (groupId: string): Promise<EnumKey<typeof ROLE>> => {
  const data = await GroupMemberApi.getMyRole(groupId);
  const roleNum = typeof data === 'number' ? data : data?.role;
  if (roleNum == null || roleNum < 0) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ROLE_FETCH_FAILED);
  }
  return ROLE.getKey(roleNum) ?? 'MEMBER';
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

export const createGroupServices = (): IGroupService => ({
  fetchGroupList,
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
