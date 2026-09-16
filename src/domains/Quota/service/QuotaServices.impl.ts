import { GROUP_TYPE } from '@/domains/Group';
import type { GroupQuotaInfo, UserGroupQuota } from '@/domains/Wallet';
import { GroupMemberApi } from '@domain-apis';
import { QuotaServicesMap } from '../mapper/QuotaServices.map';
import type { IQuotaService, SetGroupQuotaRequest } from './index.type';

const normalizePage = (page: number): number => Math.max(1, Math.floor(page));
const normalizePageSize = (pageSize: number): number => Math.max(1, Math.floor(pageSize));

/** GET /group/member/getAllMyGroupTokenInfo → PageR<GroupMemberTokenDetailResponse> */
const fetchUserGroupQuotas = async (
  page: number,
  pageSize: number
): Promise<{ quotas: UserGroupQuota[]; total: number }> => {
  const data = await GroupMemberApi.getAllMyGroupTokenInfo({
    page: normalizePage(page),
    size: normalizePageSize(pageSize),
  });
  const mapped = QuotaServicesMap.mapFetchUserGroupQuotasFromApi(data);

  return {
    quotas: mapped.quotas.filter((quota) => quota.groupType === GROUP_TYPE.ADVANCED),
    total: mapped.total,
  };
};

const fetchGroupQuota = async (groupId: string | number): Promise<GroupQuotaInfo> => {
  const data = await GroupMemberApi.getMyGroupMemberInfo({ groupId });
  return QuotaServicesMap.mapFetchGroupQuotaFromApi(data);
};

const setGroupQuota = async (params: SetGroupQuotaRequest) => {
  await GroupMemberApi.changeTokenLimit(params);
};

export const createQuotaServices = (): IQuotaService => ({
  fetchUserGroupQuotas,
  fetchGroupQuota,
  setGroupQuota,
});
