import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { toNumberIds } from '@/utils/number';
import type { ApiResponse } from '@/types/api';
import type { UserGroupQuota } from '@/types/quota';
import type { GroupQuotaInfo } from '@/types/quota';
import type { SetGroupQuotaRequest } from './index.type';

const fetchUserGroupQuotas = async (
  page: number,
  pageSize: number
): Promise<{ quotas: UserGroupQuota[]; total: number }> => {
  const res = (await Axios.get('/group/quotas/quota-by-user', {
    params: { page, size: pageSize },
  })) as ApiResponse<{
    total: number;
    list: { groupId?: number; groupName?: string; quotaLimit?: number; quotaUsed?: number }[];
  }>;
  checkResponse(res);
  const list = res.data?.list ?? [];
  const quotas: UserGroupQuota[] = list.map((item) => ({
    groupId: item.groupId ?? 0,
    groupName: item.groupName ?? '',
    quotaLimit: item.quotaLimit ?? 0,
    quotaUsed: item.quotaUsed ?? 0,
  }));
  return { quotas, total: res.data?.total ?? 0 };
};

const fetchGroupQuota = async (groupId: string | number): Promise<GroupQuotaInfo> => {
  const res = (await Axios.get('/group/quotas/group-info', {
    params: { groupId: toNumberIds(groupId) },
  })) as ApiResponse<{ quotaUsed?: number; quotaLimit?: number }>;
  checkResponse(res);
  const data = res.data;
  return {
    used: data?.quotaUsed ?? 0,
    limit: data?.quotaLimit ?? 0,
  };
};

const setGroupQuota = async (params: SetGroupQuotaRequest) => {
  const res = (await Axios.post('/group/quotas/set', params)) as ApiResponse;
  checkResponse(res);
};

export const QuotaServices = {
  fetchUserGroupQuotas,
  fetchGroupQuota,
  setGroupQuota,
};
