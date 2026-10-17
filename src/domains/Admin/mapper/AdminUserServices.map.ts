import {
  assertApiPage,
  assertApiRecord,
  invalidApiResponse,
  isFiniteNumber,
} from '@/apis/runtimeContract';
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
import { FRONTEND_NETWORK_ERROR } from '@/utils/error/codes';
import { WisePenError } from '@/utils/error/WisePenError';
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

const isAdminUserApiModel = (value: unknown): value is AdminUserApiModel => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    ((typeof row.userId === 'string' && row.userId.length > 0) ||
      (typeof row.userId === 'number' && Number.isFinite(row.userId))) &&
    typeof row.username === 'string'
  );
};

const mapAdminUserApiModelToEntity = (raw: AdminUserApiModel): AdminUser => {
  assertApiRecord(raw, 'Admin 用户列表项契约无效');
  if (!isAdminUserApiModel(raw)) invalidApiResponse('Admin 用户列表项契约无效');
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
    status: raw.userStatus == null ? 0 : normalizeUserStatusFromApi(raw.userStatus),
    createTime: raw.createTime ?? undefined,
    updateTime: raw.updateTime ?? undefined,
  };
};

const mapFetchAdminUserListRequest = (
  params: FetchAdminUserListRequest
): FetchAdminUserListApiRequest => {
  const status = params.status !== 0 ? mapUserStatusToApi(params.status) : undefined;
  const identityType =
    params.identityType > 0 ? mapIdentityTypeToApi(params.identityType) : undefined;
  return {
    page: params.page,
    size: params.size,
    keyword: params.keyword,
    ...(status ? { userStatus: status } : {}),
    ...(identityType ? { identityType } : {}),
  };
};

const mapFetchAdminUserListFromApi = (
  data: FetchAdminUserListApiResponse
): FetchAdminUserListResponse => {
  const page = assertApiPage(data, isAdminUserApiModel, 'Admin 用户分页契约无效');
  return {
    users: page.list.map(mapAdminUserApiModelToEntity),
    total: page.total,
    page: page.page,
    size: page.size,
    totalPage: page.totalPage,
  };
};

const mapAdminUserListFromApi = (data: AdminUserApiModel[]): AdminUser[] =>
  assertApiPage(
    {
      list: data,
      total: data.length,
      page: 1,
      size: Math.max(data.length, 1),
      totalPage: data.length ? 1 : 0,
    },
    isAdminUserApiModel,
    'Admin 用户列表契约无效'
  ).list.map(mapAdminUserApiModelToEntity);

const mapGetAdminUserInfoFromApi = (
  data: GetAdminUserInfoApiResponse
): GetAdminUserInfoResponse => {
  if (
    data == null ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !(
      (typeof data.userId === 'string' && data.userId.length > 0) ||
      (typeof data.userId === 'number' && isFiniteNumber(data.userId))
    )
  ) {
    throw new WisePenError({
      code: FRONTEND_NETWORK_ERROR.INVALID_RESPONSE,
      source: 'api',
      message: 'Admin 用户资料契约无效',
    });
  }
  return {
    userProfile: {
      userId: normalizeId(data.userId),
      ...(data.sex === 'MALE' || data.sex === 'FEMALE' || data.sex === 'UNKNOWN'
        ? { sex: normalizeSexFromApi(data.sex) }
        : {}),
      ...(typeof data.university === 'string' ? { university: data.university } : {}),
      ...(typeof data.college === 'string' ? { college: data.college } : {}),
      ...(typeof data.major === 'string' ? { major: data.major } : {}),
      ...(typeof data.className === 'string' ? { className: data.className } : {}),
      ...(Number.isInteger(data.enrollmentYear)
        ? { enrollmentYear: String(data.enrollmentYear) }
        : {}),
      ...(data.degreeLevel === 'UNKNOWN' ||
      data.degreeLevel === 'UNDERGRADUATE' ||
      data.degreeLevel === 'MASTER' ||
      data.degreeLevel === 'DOCTOR'
        ? { degreeLevel: normalizeDegreeLevelFromApi(data.degreeLevel) }
        : {}),
      ...(typeof data.academicTitle === 'string' ? { academicTitle: data.academicTitle } : {}),
      ...(typeof data.createTime === 'string' ? { createTime: data.createTime } : {}),
      ...(typeof data.updateTime === 'string' ? { updateTime: data.updateTime } : {}),
    },
  };
};

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
