import type { AdminUser } from '@/domains/Admin';
import {
  mapDegreeLevelToApi,
  mapIdentityTypeToApi,
  mapSexToApi,
  mapUserStatusToApi,
  normalizeDegreeLevelFromApi,
  normalizeIdentityTypeFromApi,
  normalizeSexFromApi,
  normalizeUserStatusFromApi,
} from '@/domains/User/mapper/userEnum.mapper';
import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  AdminUserApiModel,
  ChangeAdminUserInfoApiRequest,
  ChangeAdminUserProfileApiRequest,
  FetchAdminUserListApiRequest,
  FetchAdminUserListApiResponse,
  GetAdminUserInfoApiResponse,
  ResetAdminUserPasswordApiRequest,
} from '../apis/AdminUserApi.type';
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
    status: raw.status == null ? 0 : normalizeUserStatusFromApi(raw.status),
    createTime: raw.createTime ?? undefined,
    updateTime: raw.updateTime ?? undefined,
  };
};

const mapFetchAdminUserListRequest = (
  params: FetchAdminUserListRequest
): FetchAdminUserListApiRequest => ({
  page: params.page,
  size: params.size,
  keyword: params.keyword,
  ...(mapUserStatusToApi(params.status) ? { status: mapUserStatusToApi(params.status) } : {}),
  ...(mapIdentityTypeToApi(params.identityType)
    ? { identityType: mapIdentityTypeToApi(params.identityType) }
    : {}),
});

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
    sex: data.sex == null ? undefined : normalizeSexFromApi(data.sex),
    enrollmentYear: data.enrollmentYear == null ? undefined : String(data.enrollmentYear),
    degreeLevel:
      data.degreeLevel == null ? undefined : normalizeDegreeLevelFromApi(data.degreeLevel),
  },
});

const mapChangeAdminUserInfoRequest = (
  params: ChangeAdminUserInfoRequest
): ChangeAdminUserInfoApiRequest => ({
  ...params,
  identityType: mapIdentityTypeToApi(params.identityType),
  status: mapUserStatusToApi(params.status),
});

const mapChangeAdminUserProfileRequest = (
  params: ChangeAdminUserProfileRequest
): ChangeAdminUserProfileApiRequest => {
  const enrollmentYear = params.enrollmentYear == null ? undefined : Number(params.enrollmentYear);
  const payload: ChangeAdminUserProfileApiRequest = {
    userId: params.userId,
  };
  const sex = mapSexToApi(params.sex);
  const degreeLevel = mapDegreeLevelToApi(params.degreeLevel);

  if (sex !== undefined) payload.sex = sex;
  if (params.university !== undefined) payload.university = params.university;
  if (params.college !== undefined) payload.college = params.college;
  if (params.major !== undefined) payload.major = params.major;
  if (params.className !== undefined) payload.className = params.className;
  if (Number.isInteger(enrollmentYear)) payload.enrollmentYear = enrollmentYear;
  if (degreeLevel !== undefined) payload.degreeLevel = degreeLevel;
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
