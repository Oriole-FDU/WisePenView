import type { AdminUser } from '@/domains/Admin';
import { normalizeId } from '@/utils/normalize/normalizeId';
import type {
  AdminUserApiModel,
  FetchAdminUserListApiRequest,
  FetchAdminUserListApiResponse,
} from '../apis/AdminUserApi.type';
import type { FetchAdminUserListRequest, FetchAdminUserListResponse } from '../service/index.type';

export const mapAdminUserApiModelToEntity = (raw: AdminUserApiModel): AdminUser => {
  return {
    id: normalizeId(raw.id ?? raw.userId),
    username: raw.username ?? '',
    nickname: raw.nickname ?? undefined,
    realName: raw.realName ?? undefined,
    avatar: raw.avatar ?? undefined,
    identityType: raw.identityType ?? 0,
    campusNo: raw.campusNo ?? undefined,
    email: raw.email ?? undefined,
    mobile: raw.mobile ?? undefined,
    verificationMode: raw.verificationMode ?? null,
    status: raw.status ?? 0,
    createTime: raw.createTime ?? undefined,
    updateTime: raw.updateTime ?? undefined,
  };
};

export const mapFetchAdminUserListRequestToApi = (
  params: FetchAdminUserListRequest
): FetchAdminUserListApiRequest => ({
  page: params.page,
  size: params.size,
  keyword: params.keyword,
  status: params.status,
  identityType: params.identityType,
});

export const mapFetchAdminUserListResponse = (
  data: FetchAdminUserListApiResponse
): FetchAdminUserListResponse => ({
  users: data.list.map(mapAdminUserApiModelToEntity),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});
