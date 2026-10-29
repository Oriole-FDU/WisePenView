import type { GroupType } from '@/domains/Group';

/** 小组配额信息（used/limit） */
export interface GroupQuotaInfo {
  used: number;
  limit: number;
}

export interface UserGroupQuota {
  groupName: string;
  groupType: GroupType;
  quotaLimit: number;
  quotaUsed: number;
}
