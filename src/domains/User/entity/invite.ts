import type { UserInviteStatus } from '../enum';
import type { UserDisplayBase } from './user';

export type { UserInviteStatus } from '../enum';

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
