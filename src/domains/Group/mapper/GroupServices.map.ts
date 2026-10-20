import type { Group, GroupBaseInfo, GroupMemberList, GroupResConfig } from '@/domains/Group';
import { GROUP_FILE_ORG_LOGIC, ROLE } from '@/domains/Group';
import {
  coerceResourceActions,
  resourceActionsToApiKeys,
  type TagResourceAction,
} from '@/domains/Tag';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';
import type { EnumKey } from '@/utils/type/enum';

import type {
  AddGroupApiRequest,
  ChangeGroupApiRequest,
  ChangeGroupConfigApiRequest,
  ChangeRoleApiRequest,
  FetchGroupMembersApiResponse,
  GetGroupBaseInfoApiRequest,
  GetGroupBaseInfoApiResponse,
  GetGroupConfigApiRequest,
  GetGroupConfigApiResponse,
  GetGroupInfoApiRequest,
  GroupApiResponse,
  GroupDetailApiResponse,
  GroupRoleApiResponse,
  ListGroupApiRequest,
  ListGroupApiResponse,
  ListMemberApiRequest,
} from '../apis/GroupApi.type';
import type {
  CreateGroupRequest,
  EditGroupRequest,
  FetchGroupListRequest,
  FetchGroupListResponse,
  UpdateGroupResConfigRequest,
  UpdateMemberRoleRequest,
} from '../service/index.type';
import { mapGroupMemberFromApi } from './groupMember.mapper';

export const mapGroupTypeFromApi = (value: GroupApiResponse['groupType']): number => {
  if (value === 'NORMAL_GROUP') return 1;
  if (value === 'ADVANCED_GROUP') return 2;
  if (value === 'MARKET_GROUP') return 3;
  return 0;
};

const mapGroupTypeToApi = (value: number): NonNullable<GroupApiResponse['groupType']> => {
  if (value === 2) return 'ADVANCED_GROUP';
  if (value === 3) return 'MARKET_GROUP';
  return 'NORMAL_GROUP';
};

const mapGroupTypeToListApi = (value?: number): ListGroupApiRequest['groupType'] | undefined => {
  if (value === 1) return 'NORMAL_GROUP';
  if (value === 2) return 'ADVANCED_GROUP';
  if (value === 3) return 'MARKET_GROUP';
  return undefined;
};

const parseGroupMetaInfo = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

const serializeGroupMetaInfo = (value?: Record<string, unknown>): string | undefined =>
  value === undefined ? undefined : JSON.stringify(value);

const normalizeRoleCodeFromApi = (value: GroupRoleApiResponse): number | null => {
  if (value === 'OWNER') return 0;
  if (value === 'ADMIN') return 1;
  if (value === 'MEMBER') return 2;
  return null;
};

const mapRoleToApi = (value: number): ChangeRoleApiRequest['role'] => {
  if (value === 0) return 'OWNER';
  if (value === 1) return 'ADMIN';
  return 'MEMBER';
};

const mapGroupFromApi = (raw: GroupApiResponse | GroupDetailApiResponse): Group => {
  const ownerInfo = normalizeUserDisplayBaseFromApi(raw.ownerInfo);
  return {
    groupId: normalizeId(raw.groupId),
    groupName: raw.groupName ?? '',
    groupDesc: raw.groupDesc ?? '',
    groupCoverUrl: raw.groupCoverUrl ?? '',
    groupMetaInfo: parseGroupMetaInfo(raw.groupMetaInfo),
    groupType: mapGroupTypeFromApi(raw.groupType),
    ownerId: raw.ownerId == null ? undefined : normalizeId(raw.ownerId),
    ownerInfo:
      ownerInfo == null
        ? undefined
        : {
            nickname: ownerInfo.nickname ?? '',
            realName: ownerInfo.realName,
            avatar: ownerInfo.avatar,
            identityType: ownerInfo.identityType,
          },
    memberCount: raw.memberCount,
    createTime: formatTimestampToDate(raw.createTime),
    inviteCode: 'inviteCode' in raw ? raw.inviteCode : undefined,
    tokenUsed: 'tokenUsed' in raw ? (normalizeNonNegativeNumber(raw.tokenUsed) ?? 0) : undefined,
    tokenBalance:
      'tokenBalance' in raw ? (normalizeNonNegativeNumber(raw.tokenBalance) ?? 0) : undefined,
  };
};

const mapDefaultMemberActionsFromApi = (actions?: unknown[]): TagResourceAction[] =>
  coerceResourceActions(actions);

const mapFetchGroupListRequest = (params: FetchGroupListRequest): ListGroupApiRequest => ({
  groupRoleFilter: params.groupRoleFilter,
  groupType: mapGroupTypeToListApi(params.groupType),
  page: params.page,
  size: params.size,
});

const mapFetchGroupListFromApi = (data: ListGroupApiResponse): FetchGroupListResponse => ({
  groups: data.list.map(mapGroupFromApi),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
  hasMore: data.page < data.totalPage,
});

const mapFetchGroupInfoFromApi = (data: GroupApiResponse): Group => mapGroupFromApi(data);

const mapFetchGroupInfoRequest = (groupId: string): GetGroupInfoApiRequest => ({
  groupId,
});

const mapFetchGroupBaseInfoRequest = (groupId: string): GetGroupBaseInfoApiRequest => ({
  groupId,
});

const mapFetchGroupBaseInfoFromApi = (
  data: GetGroupBaseInfoApiResponse,
  fallbackGroupId: string
): GroupBaseInfo => ({
  // 基础信息接口若省略 groupId，使用请求入参保持调用方按 ID 回填。
  groupId: normalizeId(data.groupId) || fallbackGroupId,
  groupName: data.groupName ?? '',
  groupDesc: data.groupDesc ?? '',
  groupCoverUrl: data.groupCoverUrl ?? '',
  groupMetaInfo: parseGroupMetaInfo(data.groupMetaInfo),
  groupType: mapGroupTypeFromApi(data.groupType),
});

const mapGroupWalletInfoFromApi = (data: GroupDetailApiResponse): number =>
  normalizeNonNegativeNumber(data.tokenBalance) ?? 0;

const mapFetchGroupResConfigFromApi = (data: GetGroupConfigApiResponse): GroupResConfig => {
  return {
    groupId: normalizeId(data.groupId),
    fileOrgLogic: GROUP_FILE_ORG_LOGIC.TAG,
    defaultMemberActions: mapDefaultMemberActionsFromApi(data.defaultMemberActions),
  };
};

const mapFetchGroupResConfigRequest = (groupId: string): GetGroupConfigApiRequest => ({
  groupId,
});

const mapUpdateGroupResConfigRequest = (
  params: UpdateGroupResConfigRequest
): ChangeGroupConfigApiRequest => ({
  groupId: params.groupId,
  fileOrgLogic: GROUP_FILE_ORG_LOGIC.TAG,
  defaultMemberActions: resourceActionsToApiKeys(params.defaultMemberActions),
});

const mapCreateGroupFromApi = (data: string): string => normalizeId(data);

const mapCreateGroupRequest = (params: CreateGroupRequest): AddGroupApiRequest => ({
  ...params,
  groupType: mapGroupTypeToApi(params.groupType),
  groupMetaInfo: serializeGroupMetaInfo(params.groupMetaInfo),
});

const mapEditGroupRequest = (params: EditGroupRequest): ChangeGroupApiRequest => ({
  ...params,
  groupType: mapGroupTypeToApi(params.groupType),
  groupMetaInfo: serializeGroupMetaInfo(params.groupMetaInfo),
});

const mapUpdateMemberRoleRequest = (params: UpdateMemberRoleRequest): ChangeRoleApiRequest => ({
  ...params,
  role: mapRoleToApi(params.role),
});

const mapFetchGroupMembersRequest = (
  groupId: string,
  page: number,
  size: number
): ListMemberApiRequest => ({
  groupId,
  page,
  size,
});

const mapFetchGroupMembersFromApi = (data: FetchGroupMembersApiResponse): GroupMemberList => ({
  members: data.list.map(mapGroupMemberFromApi),
  total: data.total,
});

const mapFetchMyRoleInGroupRequest = (groupId: string): string => groupId;

const mapFetchMyRoleInGroupFromApi = (data: GroupRoleApiResponse): EnumKey<typeof ROLE> | null => {
  const roleNum = normalizeRoleCodeFromApi(data);
  if (roleNum == null || roleNum < 0) return null;
  return ROLE.getKey(roleNum) ?? null;
};

export const GroupServicesMap = {
  mapFetchGroupListRequest,
  mapFetchGroupListFromApi,
  mapFetchGroupInfoFromApi,
  mapFetchGroupInfoRequest,
  mapFetchGroupBaseInfoRequest,
  mapFetchGroupBaseInfoFromApi,
  mapGroupWalletInfoFromApi,
  mapFetchGroupResConfigFromApi,
  mapFetchGroupResConfigRequest,
  mapUpdateGroupResConfigRequest,
  mapCreateGroupFromApi,
  mapCreateGroupRequest,
  mapEditGroupRequest,
  mapUpdateMemberRoleRequest,
  mapFetchGroupMembersRequest,
  mapFetchGroupMembersFromApi,
  mapFetchMyRoleInGroupRequest,
  mapFetchMyRoleInGroupFromApi,
};
