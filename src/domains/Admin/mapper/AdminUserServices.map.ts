import type { AdminUser } from '@/domains/Admin';
import { IDENTITY } from '@/domains/User';
import { normalizeIdentityTypeFromApi } from '@/domains/User/mapper/userEnum.mapper';
import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  AdminUserApiModel,
  ChangeAdminUserInfoApiRequest,
  ChangeAdminUserProfileApiRequest,
  FetchAdminUserListApiRequest,
  FetchAdminUserListApiResponse,
  GetAdminUserInfoApiResponse,
  ResetAdminUserPasswordApiRequest,
} from '../apis/AdminUserApi.schema';
import type {
  ChangeAdminUserInfoRequest,
  ChangeAdminUserProfileRequest,
  FetchAdminUserListRequest,
  FetchAdminUserListResponse,
  GetAdminUserInfoResponse,
  ResetAdminUserPasswordRequest,
} from '../service/index.type';

const mapAdminUserApiModelToEntity = (raw: AdminUserApiModel): AdminUser => {
  return {
    id: normalizeId(raw.userId),
    username: raw.username ?? '',
    nickname: raw.nickname ?? undefined,
    realName: raw.realName ?? undefined,
    avatar: raw.avatar ?? undefined,
    identityType: raw.identityType == null ? 0 : normalizeIdentityTypeFromApi(raw.identityType),
    campusNo: raw.campusNo ?? undefined,
    email: raw.email ?? undefined,
    mobile: raw.mobile ?? undefined,
    verificationMode: raw.verificationMode ?? null,
    status: raw.userStatus,
    createTime: raw.createTime ?? undefined,
    updateTime: raw.updateTime ?? undefined,
  };
};

const mapFetchAdminUserListRequest = (
  params: FetchAdminUserListRequest
): FetchAdminUserListApiRequest => {
  const identityType = IDENTITY.getOption(params.identityType)?.key;
  return {
    page: params.page,
    size: params.size,
    keyword: params.keyword,
    userStatus: params.status,
    ...(identityType ? { identityType } : {}),
  };
};

const mapFetchAdminUserListFromApi = (
  data: FetchAdminUserListApiResponse
): FetchAdminUserListResponse => ({
  users: data.list.map(mapAdminUserApiModelToEntity),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});

const mapAdminUserListFromApi = (data: AdminUserApiModel[]): AdminUser[] =>
  data.map(mapAdminUserApiModelToEntity);

const mapGetAdminUserInfoFromApi = (
  data: GetAdminUserInfoApiResponse
): GetAdminUserInfoResponse => ({
  userProfile: {
    ...data,
    sex: data.sex ?? undefined,
    enrollmentYear: data.enrollmentYear == null ? undefined : String(data.enrollmentYear),
    degreeLevel: data.degreeLevel ?? undefined,
  },
});

const mapChangeAdminUserInfoRequest = (
  params: ChangeAdminUserInfoRequest
): ChangeAdminUserInfoApiRequest => {
  const { status, ...rest } = params;
  return {
    ...rest,
    ...(status !== undefined ? { userStatus: status } : {}),
  };
};

const mapChangeAdminUserProfileRequest = (
  params: ChangeAdminUserProfileRequest
): ChangeAdminUserProfileApiRequest => {
  const enrollmentYear = params.enrollmentYear == null ? undefined : Number(params.enrollmentYear);
  const payload: ChangeAdminUserProfileApiRequest = {
    userId: params.userId,
  };
  if (params.sex !== undefined) payload.sex = params.sex;
  if (params.university !== undefined) payload.university = params.university;
  if (params.college !== undefined) payload.college = params.college;
  if (params.major !== undefined) payload.major = params.major;
  if (params.className !== undefined) payload.className = params.className;
  if (Number.isInteger(enrollmentYear)) payload.enrollmentYear = enrollmentYear;
  if (params.degreeLevel !== undefined) payload.degreeLevel = params.degreeLevel;
  if (params.academicTitle !== undefined) payload.academicTitle = params.academicTitle;

  return payload;
};

const mapResetAdminUserPasswordRequest = (
  params: ResetAdminUserPasswordRequest
): ResetAdminUserPasswordApiRequest => ({
  userId: params.userId,
  ...(params.newPassword !== undefined ? { newPassword: params.newPassword } : {}),
});

export const AdminUserServicesMap = {
  mapFetchAdminUserListRequest,
  mapFetchAdminUserListFromApi,
  mapAdminUserListFromApi,
  mapGetAdminUserInfoFromApi,
  mapChangeAdminUserInfoRequest,
  mapChangeAdminUserProfileRequest,
  mapResetAdminUserPasswordRequest,
};
