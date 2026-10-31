import { normalizeUserDisplayBaseFromApi } from '@/domains/User';
import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  ListUserInviteRecordsApiRequest,
  ListUserInviteRecordsApiResponse,
  UserInviteRecordApiResponse,
} from '../apis/UserInviteApi.schema';
import type { UserInviteRecord, UserInviteRecordList } from '../entity/invite';

const mapListInviteRecordsRequest = (params: {
  page: number;
  size: number;
}): ListUserInviteRecordsApiRequest => params;

const mapInviteRecordFromApi = (data: UserInviteRecordApiResponse): UserInviteRecord => ({
  id: normalizeId(data.id),
  inviteeUserId: normalizeId(data.inviteeUserId),
  invitee: normalizeUserDisplayBaseFromApi(data.inviteeDisplay),
  status: data.status,
  createTime: data.createTime,
  rewardTime: data.rewardTime ?? undefined,
});

const mapListInviteRecordsFromApi = (
  data: ListUserInviteRecordsApiResponse
): UserInviteRecordList => ({
  records: data.list.map(mapInviteRecordFromApi),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});

export const UserInviteServicesMap = {
  mapListInviteRecordsRequest,
  mapListInviteRecordsFromApi,
};
