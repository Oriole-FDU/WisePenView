import {
  assertApiPage,
  assertApiRecord,
  invalidApiResponse,
  isApiId,
  isRecord,
  optionalApiString,
} from '@/apis/runtimeContract';
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
import {
  normalizeFiniteNumber,
  normalizeNonNegativeNumber,
} from '@/utils/normalize/normalizeNumber';
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
  GroupMemberApiResponse,
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
  assertApiRecord(raw, '小组响应契约无效');
  if (!isApiId(raw.groupId) || typeof raw.groupName !== 'string')
    invalidApiResponse('小组响应契约无效');
  const ownerInfo = normalizeUserDisplayBaseFromApi(raw.ownerInfo);
  return {
    groupId: normalizeId(raw.groupId),
    groupName: raw.groupName ?? '',
    groupDesc: optionalApiString(raw.groupDesc) ?? '',
    groupCoverUrl: optionalApiString(raw.groupCoverUrl) ?? '',
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
    createTime: formatTimestampToDate(
      typeof raw.createTime === 'string' ? raw.createTime : undefined
    ),
    inviteCode: optionalApiString(raw.inviteCode) ?? undefined,
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

const mapFetchGroupListFromApi = (data: ListGroupApiResponse): FetchGroupListResponse => {
  const page = assertApiPage(data, isRecord, '小组分页响应契约无效');
  return {
    groups: page.list.map(mapGroupFromApi),
    total: page.total,
    page: page.page,
    size: page.size,
    totalPage: page.totalPage,
    hasMore: page.page < page.totalPage,
  };
};

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
): GroupBaseInfo => {
  assertApiRecord(data, '小组基础信息契约无效');
  if (typeof data.groupName !== 'string') invalidApiResponse('小组基础信息契约无效');
  return {
    // 基础信息接口若省略 groupId，使用请求入参保持调用方按 ID 回填。
    groupId: normalizeId(data.groupId) || fallbackGroupId,
    groupName: data.groupName ?? '',
    groupDesc: optionalApiString(data.groupDesc) ?? '',
    groupCoverUrl: optionalApiString(data.groupCoverUrl) ?? '',
    groupMetaInfo: parseGroupMetaInfo(data.groupMetaInfo),
    groupType: mapGroupTypeFromApi(data.groupType),
  };
};

const mapGroupWalletInfoFromApi = (data: GroupApiResponse): number =>
  normalizeNonNegativeNumber(data.tokenBalance) ?? 0;

const mapFetchGroupResConfigFromApi = (data: GetGroupConfigApiResponse): GroupResConfig => {
  assertApiRecord(data, '小组资源配置契约无效');
  if (!isApiId(data.groupId) || !Array.isArray(data.defaultMemberActions))
    invalidApiResponse('小组资源配置契约无效');
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

const mapCreateGroupFromApi = (data: string | number): string => {
  if (!isApiId(data)) invalidApiResponse('小组标识契约无效');
  return normalizeId(data);
};

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

const mapFetchGroupMembersFromApi = (data: FetchGroupMembersApiResponse): GroupMemberList => {
  const page = assertApiPage(
    data,
    (value): value is GroupMemberApiResponse => isRecord(value),
    '小组成员分页响应契约无效'
  );
  return {
    members: page.list.map(mapGroupMemberFromApi),
    total: page.total,
  };
};

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
