import { GROUP_TYPE, type GroupQuotaInfo, type UserGroupQuota } from '@/domains/Group';
import type {
  GetAllMyGroupTokenInfoApiResponse,
  GetMyGroupMemberInfoApiResponse,
  GroupTokenInfoApiResponseItem,
} from '@/domains/Group/apis/GroupApi.type';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';

const mapUserGroupQuotaFromApi = (item: GroupTokenInfoApiResponseItem): UserGroupQuota => {
  const base = item.groupDisplayBase ?? {};
  const groupType = base.groupType;
  if (
    groupType !== GROUP_TYPE.NORMAL &&
    groupType !== GROUP_TYPE.ADVANCED &&
    groupType !== GROUP_TYPE.PUBLIC
  ) {
    throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_INFO_FETCH_FAILED);
  }

  return {
    groupId: normalizeId(base.groupId),
    groupName: base.groupName ?? '',
    groupType,
    quotaLimit: normalizeNonNegativeNumber(item.tokenLimit) ?? 0,
    quotaUsed: normalizeNonNegativeNumber(item.tokenUsed) ?? 0,
  };
};

const mapFetchUserGroupQuotasFromApi = (
  data: GetAllMyGroupTokenInfoApiResponse
): { quotas: UserGroupQuota[]; total: number } => {
  const rawList = data.list ?? [];
  const quotas = rawList.map(mapUserGroupQuotaFromApi);

  return {
    quotas,
    total: normalizeNonNegativeNumber(data.total) ?? quotas.length,
  };
};

const mapFetchGroupQuotaFromApi = (data: GetMyGroupMemberInfoApiResponse): GroupQuotaInfo => ({
  used: normalizeNonNegativeNumber(data.tokenUsed) ?? 0,
  limit: normalizeNonNegativeNumber(data.tokenLimit) ?? 0,
});

export const GroupQuotaMap = {
  mapFetchUserGroupQuotasFromApi,
  mapFetchGroupQuotaFromApi,
};
