import { GROUP_TYPE, type GroupQuotaInfo, type UserGroupQuota } from '@/domains/Group';
import type {
  GetAllMyGroupTokenInfoApiResponse,
  GetMyGroupMemberInfoApiResponse,
} from '@/domains/Group/apis/GroupApi.contract';
import type { GroupTokenInfoApi } from '@/domains/Group/apis/GroupApi.schema';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

const mapUserGroupQuotaFromApi = (item: GroupTokenInfoApi): UserGroupQuota => {
  const base = item.groupDisplayBase;
  const groupType = base.groupType;
  if (
    groupType !== GROUP_TYPE.NORMAL &&
    groupType !== GROUP_TYPE.ADVANCED &&
    groupType !== GROUP_TYPE.PUBLIC
  ) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
  }

  return {
    groupName: base.groupName,
    groupType,
    quotaLimit: item.tokenLimit,
    quotaUsed: item.tokenUsed,
  };
};

const mapFetchUserGroupQuotasFromApi = (
  data: GetAllMyGroupTokenInfoApiResponse
): { quotas: UserGroupQuota[]; total: number } => {
  const quotas = data.list.map(mapUserGroupQuotaFromApi);

  return {
    quotas,
    total: data.total,
  };
};

const mapFetchGroupQuotaFromApi = (data: GetMyGroupMemberInfoApiResponse): GroupQuotaInfo => ({
  used: data.tokenUsed,
  limit: data.tokenLimit,
});

export const GroupQuotaMap = {
  mapFetchUserGroupQuotasFromApi,
  mapFetchGroupQuotaFromApi,
};
