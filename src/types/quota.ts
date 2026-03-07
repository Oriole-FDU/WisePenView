/** 小组配额信息（used/limit） */
export interface GroupQuotaInfo {
  used: number;
  limit: number;
}

export interface UserGroupQuota {
  groupId: string | number;
  groupName: string;
  quotaLimit: number;
  quotaUsed: number;
}
