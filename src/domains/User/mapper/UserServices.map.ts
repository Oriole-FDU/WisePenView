import type { User, UserAccountProfile, UserSearchUser } from '@/domains/User';
import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  AddFeedbackApiRequest,
  ChangeUserInfoApiRequest,
  ChangeUserProfileApiRequest,
  CheckEmailVerifyApiRequest,
  GetUserInfoApiResponse,
  InitiateEmailVerifyApiRequest,
  InitiateFudanUISVerifyApiRequest,
  ListUserSearchSuggestionsApiRequest,
  SearchUserApiRequest,
  UserSearchUserApiResponse,
} from '../apis/UserApi.type';
import type {
  UserTaskCheckInApiResponse,
  UserTaskPeriodicStatusApiResponse,
  UserTaskRewardPreviewApiResponse,
  UserTaskStatusApiResponse,
} from '../apis/UserTaskApi.type';
import type {
  UserTaskCheckInResult,
  UserTaskPeriodicStatus,
  UserTaskRewardPreview,
  UserTaskStatus,
} from '../entity/userTask';
import { FEEDBACK_TYPE, type FeedbackType } from '../enum';
import type {
  ConfirmEmailVerifyRequest,
  FudanUISVerifyStatusData,
  InitiateUISVerifyRequest,
  ListUserSearchSuggestionsRequest,
  SearchUsersRequest,
  SendEmailVerifyRequest,
  SubmitFeedbackRequest,
  UpdateUserInfoRequest,
} from '../service/index.type';
import {
  mapDegreeLevelToApi,
  mapSexToApi,
  normalizeDegreeLevelFromApi,
  normalizeIdentityTypeFromApi,
  normalizeSexFromApi,
  normalizeUserDisplayBaseFromApi,
  normalizeUserStatusFromApi,
} from './userEnum.mapper';

type CachedUserSafe = Pick<
  User,
  'id' | 'username' | 'nickname' | 'avatar' | 'identityType' | 'realName'
>;

const mapAccountProfileFromApi = (data: GetUserInfoApiResponse): UserAccountProfile => {
  const { userInfo, userProfile } = data;
  return {
    id: normalizeId(data.userId),
    userInfo: {
      nickname: userInfo.nickname ?? undefined,
      realName: userInfo.realName ?? undefined,
      avatar: userInfo.avatar ?? undefined,
      identityType: normalizeIdentityTypeFromApi(userInfo.identityType),
      username: userInfo.username,
      campusNo: userInfo.campusNo,
      email: userInfo.email ?? undefined,
      mobile: userInfo.mobile ?? undefined,
      verificationMode: userInfo.verificationMode,
      status: normalizeUserStatusFromApi(userInfo.userStatus),
    },
    userProfile: {
      sex: normalizeSexFromApi(userProfile.sex),
      university: userProfile.university,
      college: userProfile.college ?? undefined,
      major: userProfile.major ?? undefined,
      className: userProfile.className ?? undefined,
      enrollmentYear:
        userProfile.enrollmentYear == null ? undefined : String(userProfile.enrollmentYear),
      degreeLevel: normalizeDegreeLevelFromApi(userProfile.degreeLevel),
      academicTitle: userProfile.academicTitle ?? undefined,
    },
    readonlyFields: data.readonlyFields ?? [],
  };
};

const mapUserSafeFromAccountProfile = (data: UserAccountProfile): CachedUserSafe => ({
  id: data.id,
  username: data.userInfo.username,
  nickname: data.userInfo.nickname,
  realName: data.userInfo.realName,
  avatar: data.userInfo.avatar,
  identityType: data.userInfo.identityType,
});

const mapSearchUsersRequest = (params: SearchUsersRequest): SearchUserApiRequest => ({
  keyword: params.keyword.trim(),
});

const mapListUserSearchSuggestionsRequest = (
  params: ListUserSearchSuggestionsRequest
): ListUserSearchSuggestionsApiRequest => ({
  keyword: params.keyword.trim(),
  ...(params.size == null ? {} : { size: params.size }),
});

const mapSearchUserFromApi = (data: UserSearchUserApiResponse): UserSearchUser => {
  const displayInfo = normalizeUserDisplayBaseFromApi(data);
  return {
    userId: normalizeId(data.userId),
    username: data.username,
    nickname: displayInfo?.nickname,
    realName: displayInfo?.realName,
    avatar: displayInfo?.avatar,
    identityType: displayInfo?.identityType,
  };
};

const mapSearchUsersFromApi = (data: UserSearchUserApiResponse[]): UserSearchUser[] =>
  data.map(mapSearchUserFromApi);

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
      completed: false,
      requireAction: false,
      actionPayload: '',
      message: '',
    };
  }
  const data = raw as Record<string, unknown>;
  return {
    completed: Boolean(data.completed),
    requireAction: Boolean(data.requireAction),
    actionPayload: typeof data.actionPayload === 'string' ? data.actionPayload : '',
    message: typeof data.message === 'string' ? data.message : '',
  };
};

const mapConfirmEmailVerifyRequest = (
  params: ConfirmEmailVerifyRequest
): CheckEmailVerifyApiRequest => ({
  token: params.token,
});

const hasFeedbackType = (types: FeedbackType[], type: FeedbackType): boolean =>
  types.includes(type);

const mapSubmitFeedbackRequest = (params: SubmitFeedbackRequest): AddFeedbackApiRequest => ({
  content: params.content,
  contact: params.contact,
  imageUrl: params.imageUrl?.trim() || undefined,
  bugReport: hasFeedbackType(params.types, FEEDBACK_TYPE.BUG_REPORT),
  suggestion: hasFeedbackType(params.types, FEEDBACK_TYPE.SUGGESTION),
  consultation: hasFeedbackType(params.types, FEEDBACK_TYPE.CONSULTATION),
  complaint: hasFeedbackType(params.types, FEEDBACK_TYPE.COMPLAINT),
  other: hasFeedbackType(params.types, FEEDBACK_TYPE.OTHER),
});

const mapTaskRewardPreviewFromApi = (
  data: UserTaskRewardPreviewApiResponse | null | undefined
): UserTaskRewardPreview | undefined => {
  if (!data) return undefined;
  return {
    rewardType: data.rewardType,
    rewardAmount: data.rewardAmount ?? undefined,
    minRewardAmount: data.minRewardAmount ?? undefined,
    maxRewardAmount: data.maxRewardAmount ?? undefined,
    rewardStepAmount: data.rewardStepAmount ?? undefined,
  };
};

const mapTaskPeriodicStatusFromApi = (
  data: UserTaskPeriodicStatusApiResponse | null | undefined
): UserTaskPeriodicStatus | undefined => {
  if (!data) return undefined;
  return {
    completedTimes: data.completedTimes,
    maxTimes: data.maxTimes,
    windowStart: data.windowStart ?? undefined,
    windowEnd: data.windowEnd ?? undefined,
    lastCompleteTime: data.lastCompleteTime ?? undefined,
  };
};

const mapTaskStatusFromApi = (data: UserTaskStatusApiResponse): UserTaskStatus => ({
  taskCode: data.taskCode,
  taskType: data.taskType,
  enabled: data.enabled,
  canComplete: data.canComplete,
  rewardPreview: mapTaskRewardPreviewFromApi(data.rewardPreview),
  once: data.once
    ? {
        completed: data.once.completed,
        completeTime: data.once.completeTime ?? undefined,
      }
    : undefined,
  periodic: mapTaskPeriodicStatusFromApi(data.periodic),
});

const mapTaskStatusesFromApi = (data: UserTaskStatusApiResponse[]): UserTaskStatus[] =>
  data.map(mapTaskStatusFromApi);

const mapTaskCheckInFromApi = (data: UserTaskCheckInApiResponse): UserTaskCheckInResult => ({
  rewardType: data.rewardType,
  rewardAmount: data.rewardAmount,
  hitGuarantee: data.hitGuarantee,
  cycleProgress: data.cycleProgress,
  cycleCount: data.cycleCount,
  checkedInToday: data.checkedInToday,
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
  if (params.sex !== undefined) userProfilePayload.sex = mapSexToApi(params.sex);
  if (params.university !== undefined) userProfilePayload.university = params.university;
  if (params.college !== undefined) userProfilePayload.college = params.college;
  if (params.major !== undefined) userProfilePayload.major = params.major;
  if (params.className !== undefined) userProfilePayload.className = params.className;
  if (params.enrollmentYear !== undefined) {
    const enrollmentYear = Number(params.enrollmentYear);
    if (Number.isInteger(enrollmentYear)) {
      userProfilePayload.enrollmentYear = enrollmentYear;
    }
  }
  if (params.degreeLevel !== undefined) {
    userProfilePayload.degreeLevel = mapDegreeLevelToApi(params.degreeLevel);
  }
  if (params.academicTitle !== undefined) userProfilePayload.academicTitle = params.academicTitle;

  return { userInfoPayload, userProfilePayload };
};

export const UserServicesMap = {
  mapAccountProfileFromApi,
  mapUserSafeFromAccountProfile,
  mapSearchUsersRequest,
  mapListUserSearchSuggestionsRequest,
  mapSearchUsersFromApi,
  mapSendEmailVerifyRequest,
  mapInitiateUISVerifyRequest,
  mapFudanUISVerifyStatusFromApi,
  mapConfirmEmailVerifyRequest,
  mapSubmitFeedbackRequest,
  mapTaskStatusesFromApi,
  mapTaskCheckInFromApi,
  mapUpdateUserInfoRequests,
};
