import type { Group, GroupBaseInfo, GroupMemberList, GroupResConfig } from '@/domains/Group';
import { GROUP_FILE_ORG_LOGIC, ROLE } from '@/domains/Group';
import {
  coerceResourceActions,
  resourceActionsToApiKeys,
  type TagResourceAction,
} from '@/domains/Tag';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import type { EnumKey } from '@/utils/enum';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';
import {
  normalizeFiniteNumber,
  normalizeNonNegativeNumber,
} from '@/utils/normalize/normalizeNumber';

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

const mapGroupTypeFromApi = (value: unknown): number => normalizeFiniteNumber(value) ?? 0;

const mapGroupTypeToApi = (value: number): string => String(value);

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

const normalizeRoleCodeFromApi = (value: unknown): number | null =>
  normalizeFiniteNumber(value) ?? null;

const mapRoleToApi = (value: number): string => String(value);

const mapGroupFromApi = (raw: GroupApiResponse): Group => {
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
    memberCount: normalizeNonNegativeNumber(raw.memberCount) ?? 0,
    createTime: formatTimestampToDate(raw.createTime),
    inviteCode: raw.inviteCode ?? undefined,
    tokenUsed: raw.tokenUsed == null ? undefined : (normalizeNonNegativeNumber(raw.tokenUsed) ?? 0),
    tokenBalance:
      raw.tokenBalance == null ? undefined : (normalizeNonNegativeNumber(raw.tokenBalance) ?? 0),
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

const mapGroupWalletInfoFromApi = (data: GroupApiResponse): number =>
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

const mapCreateGroupFromApi = (data: string | number): string => normalizeId(data);

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
  groupId: string | number,
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
