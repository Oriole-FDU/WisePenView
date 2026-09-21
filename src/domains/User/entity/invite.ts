import type { UserDisplayBase } from './user';

/** 邀请关系状态：后端被邀请人完成身份认证后由 BOUND 变为 REWARDED */
export type UserInviteStatus = 'BOUND' | 'REWARDED';

/** 当前用户发出的邀请记录 */
export interface UserInviteRecord {
  id: string;
  inviteeUserId: string;
  invitee?: UserDisplayBase;
  status: UserInviteStatus;
  createTime?: string;
  rewardTime?: string;
}

export interface UserInviteRecordList {
  records: UserInviteRecord[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}
