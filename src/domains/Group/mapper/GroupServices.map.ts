import { normalizeResourceActions } from '@/domains/_shared/access';
import type { Group, GroupBaseInfo, GroupMemberList, GroupResConfig } from '@/domains/Group';
import { GROUP_TYPE, type GroupType, ROLE } from '@/domains/Group';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import type { EnumKey } from '@/utils/type/enum';

import type {
  AddGroupApiRequest,
  ChangeGroupApiRequest,
  ChangeGroupConfigApiRequest,
  GetGroupBaseInfoApiResponse,
  GetGroupConfigApiResponse,
  GetMyRoleInGroupApiResponse,
  ListGroupApiRequest,
  ListGroupApiResponse,
  ListGroupMemberApiResponse,
} from '../apis/GroupApi.contract';
import type { GroupDetailApi, GroupItemApi } from '../apis/GroupApi.schema';
import type {
  CreateGroupRequest,
  EditGroupRequest,
  FetchGroupListRequest,
  FetchGroupListResponse,
  UpdateGroupResConfigRequest,
} from '../service/index.type';
import { mapGroupMemberFromApi } from './groupMember.mapper';

const mapGroupTypeToListApi = (value?: GroupType): ListGroupApiRequest['groupType'] | undefined => {
  if (value === GROUP_TYPE.NORMAL) return 'NORMAL_GROUP';
  if (value === GROUP_TYPE.ADVANCED) return 'ADVANCED_GROUP';
  if (value === GROUP_TYPE.PUBLIC) return 'MARKET_GROUP';
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

const mapGroupFromApi = (raw: GroupItemApi | GroupDetailApi): Group => {
  const ownerInfo = normalizeUserDisplayBaseFromApi(raw.ownerInfo);
  const hasDetail = 'inviteCode' in raw;
  return {
    groupId: raw.groupId,
    groupName: raw.groupName,
    groupDesc: raw.groupDesc,
    groupCoverUrl: raw.groupCoverUrl,
    groupMetaInfo: parseGroupMetaInfo(raw.groupMetaInfo),
    groupType: raw.groupType,
    ownerId: raw.ownerId,
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
    inviteCode: hasDetail ? raw.inviteCode : undefined,
    tokenUsed: hasDetail ? raw.tokenUsed : undefined,
    tokenBalance: hasDetail ? raw.tokenBalance : undefined,
  };
};

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

const mapFetchGroupBaseInfoFromApi = (data: GetGroupBaseInfoApiResponse): GroupBaseInfo => ({
  groupId: data.groupId,
  groupName: data.groupName,
  groupDesc: data.groupDesc,
  groupCoverUrl: data.groupCoverUrl,
  groupMetaInfo: parseGroupMetaInfo(data.groupMetaInfo),
  groupType: data.groupType,
});

const mapFetchGroupResConfigFromApi = (data: GetGroupConfigApiResponse): GroupResConfig => {
  return {
    groupId: data.groupId,
    fileOrgLogic: data.fileOrgLogic,
    defaultMemberActions: normalizeResourceActions(data.defaultMemberActions),
  };
};

const mapUpdateGroupResConfigRequest = (
  params: UpdateGroupResConfigRequest
): ChangeGroupConfigApiRequest => ({
  groupId: params.groupId,
  fileOrgLogic: params.fileOrgLogic,
  defaultMemberActions: params.defaultMemberActions
    ? normalizeResourceActions(params.defaultMemberActions)
    : undefined,
});

const mapCreateGroupRequest = (params: CreateGroupRequest): AddGroupApiRequest => ({
  ...params,
  groupMetaInfo: serializeGroupMetaInfo(params.groupMetaInfo),
});

const mapEditGroupRequest = (params: EditGroupRequest): ChangeGroupApiRequest => ({
  ...params,
  groupMetaInfo: serializeGroupMetaInfo(params.groupMetaInfo),
});

const mapFetchGroupMembersFromApi = (data: ListGroupMemberApiResponse): GroupMemberList => ({
  members: data.list.map(mapGroupMemberFromApi),
  total: data.total,
});

const mapFetchMyRoleInGroupFromApi = (
  data: GetMyRoleInGroupApiResponse
): EnumKey<typeof ROLE> | null => {
  if (data < 0) return null;
  const role = ROLE.getOption(data);
  if (!role) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ROLE_FETCH_FAILED);
  return role.key;
};

export const GroupServicesMap = {
  mapFetchGroupListRequest,
  mapFetchGroupListFromApi,
  mapGroupFromApi,
  mapFetchGroupBaseInfoFromApi,
  mapFetchGroupResConfigFromApi,
  mapUpdateGroupResConfigRequest,
  mapCreateGroupRequest,
  mapEditGroupRequest,
  mapFetchGroupMembersFromApi,
  mapFetchMyRoleInGroupFromApi,
};
