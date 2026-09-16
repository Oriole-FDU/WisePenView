import { GROUP_TYPE } from '@/domains/Group';
import type { IQuotaService } from '@/domains/Quota';
import type { GroupQuotaInfo, UserGroupQuota } from '@/domains/Wallet';

import mockdata from './mockdata.json';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const userGroupQuotas = mockdata.userGroupQuotas as UserGroupQuota[];
const groupQuotaInfo = mockdata.groupQuotaInfo as GroupQuotaInfo;

const fetchUserGroupQuotas = async (
  page: number,
  pageSize: number
): Promise<{ quotas: UserGroupQuota[]; total: number }> => {
  await delay(200);
  const advancedGroupQuotas = userGroupQuotas.filter(
    (quota) => quota.groupType === GROUP_TYPE.ADVANCED
  );
  const safePageSize = Math.max(1, pageSize);
  const startIndex = (Math.max(1, page) - 1) * safePageSize;

  return {
    quotas: advancedGroupQuotas.slice(startIndex, startIndex + safePageSize),
    total: advancedGroupQuotas.length,
  };
};

const fetchGroupQuota = async (_groupId: string | number): Promise<GroupQuotaInfo> => {
  await delay(200);
  return groupQuotaInfo;
};

const setGroupQuota = async (): Promise<void> => {
  await delay(150);
};

export const QuotaServicesMock: IQuotaService = {
  fetchUserGroupQuotas,
  fetchGroupQuota,
  setGroupQuota,
};
