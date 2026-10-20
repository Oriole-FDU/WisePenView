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
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { mapNullable, mapOptional } from '@/utils/type/nullable';

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
    username: raw.username,
    nickname: raw.nickname,
    realName: raw.realName,
    avatar: raw.avatar,
    identityType: normalizeIdentityTypeFromApi(raw.identityType),
    campusNo: raw.campusNo,
    email: raw.email,
    mobile: raw.mobile,
    verificationMode: raw.verificationMode,
    verificationProviderCode: raw.verificationProviderCode,
    status: normalizeUserStatusFromApi(raw.userStatus),
    createTime: mapNullable(raw.createTime, formatTimestampToDate),
    updateTime: mapNullable(raw.updateTime, formatTimestampToDate),
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
    userId: normalizeId(data.userId),
    sex: mapNullable(data.sex, normalizeSexFromApi),
    inviteCode: data.inviteCode,
    university: data.university,
    college: data.college,
    major: data.major,
    className: data.className,
    enrollmentYear: mapNullable(data.enrollmentYear, String),
    degreeLevel: mapNullable(data.degreeLevel, normalizeDegreeLevelFromApi),
    academicTitle: data.academicTitle,
    createTime: mapNullable(data.createTime, formatTimestampToDate),
    updateTime: mapNullable(data.updateTime, formatTimestampToDate),
  },
});

const mapChangeAdminUserInfoRequest = (
  params: ChangeAdminUserInfoRequest
): ChangeAdminUserInfoApiRequest => ({
  ...params,
  identityType: mapIdentityTypeToApi(params.identityType),
  userStatus: mapUserStatusToApi(params.status),
});

const mapChangeAdminUserProfileRequest = (
  params: ChangeAdminUserProfileRequest
): ChangeAdminUserProfileApiRequest => {
  const enrollmentYear = mapOptional(params.enrollmentYear, Number);
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
