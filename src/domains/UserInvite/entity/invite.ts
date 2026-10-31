import type { UserDisplayBase } from '@/domains/User';

/** 邀请关系状态：后端被邀请人完成身份认证后由 BOUND 变为 REWARDED。 */
export type UserInviteStatus = 'BOUND' | 'REWARDED';

export interface UserInviteRecord {
  id: string;
  inviteeUserId: string;
  invitee?: UserDisplayBase;
  status: UserInviteStatus;
  createTime?: number;
  rewardTime?: number;
}

export interface UserInviteRecordList {
  records: UserInviteRecord[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}
