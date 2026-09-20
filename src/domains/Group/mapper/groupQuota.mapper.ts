import type { GroupQuotaInfo, UserGroupQuota } from '@/domains/Group';
import type {
  GetAllMyGroupTokenInfoApiResponse,
  GetMyGroupMemberInfoApiResponse,
  GroupTokenInfoApiResponseItem,
} from '@/domains/Group/apis/GroupApi.type';
import { normalizeId } from '@/utils/normalize/normalizeId';
import {
  normalizeFiniteNumber,
  normalizeNonNegativeNumber,
} from '@/utils/normalize/normalizeNumber';

const mapUserGroupQuotaFromApi = (item: GroupTokenInfoApiResponseItem): UserGroupQuota => {
  const base = item.groupDisplayBase ?? {};

  return {
    groupId: normalizeId(base.groupId),
    groupName: base.groupName ?? '',
    groupType: normalizeFiniteNumber(base.groupType) ?? 0,
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
