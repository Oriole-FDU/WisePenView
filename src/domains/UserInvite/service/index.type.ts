import type { UserInviteRecordList } from '../entity/invite';

export interface ListUserInviteRecordsRequest {
  page: number;
  size: number;
}

export interface IUserInviteService {
  listInviteRecords(params: ListUserInviteRecordsRequest): Promise<UserInviteRecordList>;
}
