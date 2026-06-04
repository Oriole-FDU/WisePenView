import type { User } from '@/domains/User';
import { normalizeId } from '@/utils/normalize/normalizeId';
import type {
  ChangeUserInfoApiRequest,
  ChangeUserProfileApiRequest,
  CheckEmailVerifyApiRequest,
  GetUserInfoApiResponse,
  InitiateEmailVerifyApiRequest,
  InitiateFudanUISVerifyApiRequest,
} from '../apis/UserApi.type';
import type {
  ConfirmEmailVerifyRequest,
  FudanUISVerifyStatusData,
  InitiateUISVerifyRequest,
  SendEmailVerifyRequest,
  UpdateUserInfoRequest,
} from '../service/index.type';

type CachedUserSafe = Pick<User, 'id' | 'username' | 'nickname' | 'avatar' | 'identityType'>;

const mapUserSafeFromApi = (data: GetUserInfoApiResponse): CachedUserSafe => {
  const { userInfo } = data;
  return {
    id: normalizeId(data.userId),
    username: userInfo.username,
    nickname: userInfo.nickname ?? undefined,
    avatar: userInfo.avatar ?? undefined,
    identityType: userInfo.identityType,
  };
};

const mapSendEmailVerifyRequest = (
  params: SendEmailVerifyRequest
): InitiateEmailVerifyApiRequest => ({
  email: params.email,
});

const mapInitiateUISVerifyRequest = (
  params: InitiateUISVerifyRequest
): InitiateFudanUISVerifyApiRequest => ({
  uisAccount: params.uisAccount,
  uisPassword: params.uisPassword,
});

const mapFudanUISVerifyStatusFromApi = (raw: unknown): FudanUISVerifyStatusData => {
  if (!raw || typeof raw !== 'object') {
    return {
      // fallback：接口异常空响应时按未完成处理
      completed: false,
      // fallback：接口异常空响应时不要求前端动作
      requireAction: false,
      // fallback：接口异常空响应时无动作载荷
      actionPayload: '',
      // fallback：接口异常空响应时无提示文案
      message: '',
    };
  }
  const data = raw as Record<string, unknown>;
  return {
    completed: Boolean(data.completed),
    requireAction: Boolean(data.requireAction),
    // fallback：非字符串二维码载荷按空字符串处理
    actionPayload: typeof data.actionPayload === 'string' ? data.actionPayload : '',
    // fallback：非字符串提示按空字符串处理
    message: typeof data.message === 'string' ? data.message : '',
  };
};

const mapConfirmEmailVerifyRequest = (
  params: ConfirmEmailVerifyRequest
): CheckEmailVerifyApiRequest => ({
  token: params.token,
});

const mapUpdateUserInfoRequests = (
  params: UpdateUserInfoRequest
): {
  userInfoPayload: ChangeUserInfoApiRequest;
  userProfilePayload: ChangeUserProfileApiRequest;
} => {
  const userInfoPayload: ChangeUserInfoApiRequest = {};
  if (params.nickname !== undefined) userInfoPayload.nickname = params.nickname;
  if (params.realName !== undefined) userInfoPayload.realName = params.realName;
  if (params.avatar !== undefined) userInfoPayload.avatar = params.avatar;

  const userProfilePayload: ChangeUserProfileApiRequest = {};
  if (params.sex !== undefined) userProfilePayload.sex = params.sex;
  if (params.university !== undefined) userProfilePayload.university = params.university;
  if (params.college !== undefined) userProfilePayload.college = params.college;
  if (params.major !== undefined) userProfilePayload.major = params.major;
  if (params.className !== undefined) userProfilePayload.className = params.className;
  if (params.enrollmentYear !== undefined) {
    userProfilePayload.enrollmentYear = params.enrollmentYear;
  }
  if (params.degreeLevel !== undefined) userProfilePayload.degreeLevel = params.degreeLevel;
  if (params.academicTitle !== undefined) userProfilePayload.academicTitle = params.academicTitle;

  return { userInfoPayload, userProfilePayload };
};

export const UserServicesMap = {
  mapUserSafeFromApi,
  mapSendEmailVerifyRequest,
  mapInitiateUISVerifyRequest,
  mapFudanUISVerifyStatusFromApi,
  mapConfirmEmailVerifyRequest,
  mapUpdateUserInfoRequests,
};
