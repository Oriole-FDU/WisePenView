import {
  assertApiArray,
  assertApiPage,
  assertApiRecord,
  invalidApiResponse,
  isApiId,
  isRecord,
} from '@/apis/runtimeContract';
import type {
  User,
  UserAccountProfile,
  UserInviteRecord,
  UserInviteRecordList,
  UserSearchUser,
  UserTourStatus,
} from '@/domains/User';
import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  AddFeedbackApiRequest,
  ChangeUserInfoApiRequest,
  ChangeUserProfileApiRequest,
  CheckEmailVerifyApiRequest,
  CheckFudanUISVerifyApiResponse,
  GetUserInfoApiResponse,
  InitiateEmailVerifyApiRequest,
  InitiateFudanUISVerifyApiRequest,
  ListUserInviteRecordsApiRequest,
  ListUserInviteRecordsApiResponse,
  ListUserSearchSuggestionsApiRequest,
  SearchUserApiRequest,
  UserInviteRecordApiResponse,
  UserSearchUserApiResponse,
} from '../apis/UserApi.type';
import type {
  UserTaskCheckInApiResponse,
  UserTaskPeriodicStatusApiResponse,
  UserTaskRewardPreviewApiResponse,
  UserTaskStatusApiResponse,
} from '../apis/UserTaskApi.type';
import type { UserTourStatusApiResponse } from '../apis/UserTourApi.type';
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
  ListUserInviteRecordsRequest,
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
  'id' | 'username' | 'nickname' | 'avatar' | 'identityType' | 'realName' | 'inviteCode'
>;

const mapAccountProfileFromApi = (data: GetUserInfoApiResponse): UserAccountProfile => {
  assertApiRecord(data, '用户资料响应契约无效');
  if (
    !isRecord(data.userInfo) ||
    !isRecord(data.userProfile) ||
    (typeof data.userId !== 'string' && typeof data.userId !== 'number')
  )
    invalidApiResponse('用户资料响应契约无效');
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
      verificationProviderCode: userInfo.verificationProviderCode,
      status: normalizeUserStatusFromApi(userInfo.userStatus),
    },
    userProfile: {
      sex: normalizeSexFromApi(userProfile.sex),
      inviteCode: userProfile.inviteCode ?? undefined,
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
  inviteCode: data.userProfile.inviteCode,
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

const isSearchUserApiResponse = (value: unknown): value is UserSearchUserApiResponse =>
  isRecord(value) &&
  isApiId(value.userId) &&
  typeof value.username === 'string' &&
  value.username.trim().length > 0;

const mapSearchUsersFromApi = (data: UserSearchUserApiResponse[]): UserSearchUser[] => {
  assertApiArray(data, isSearchUserApiResponse, '用户搜索响应契约无效');
  return data.map(mapSearchUserFromApi);
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

const mapFudanUISVerifyStatusFromApi = (
  data: CheckFudanUISVerifyApiResponse | null | undefined
): FudanUISVerifyStatusData => {
  return {
    completed: data?.completed === true,
    requireAction: data?.requireAction === true,
    actionPayload: typeof data?.actionPayload === 'string' ? data.actionPayload : '',
    message: typeof data?.message === 'string' ? data.message : '',
  };
};

const mapConfirmEmailVerifyRequest = (
  params: ConfirmEmailVerifyRequest
): CheckEmailVerifyApiRequest => ({
  token: params.token,
});

const mapListInviteRecordsRequest = (
  params: ListUserInviteRecordsRequest
): ListUserInviteRecordsApiRequest => ({
  page: params.page,
  size: params.size,
});

const mapInviteRecordFromApi = (data: UserInviteRecordApiResponse): UserInviteRecord => ({
  id: normalizeId(data.id),
  inviteeUserId: normalizeId(data.inviteeUserId),
  invitee: normalizeUserDisplayBaseFromApi(data.inviteeDisplay),
  status: data.status === 'REWARDED' ? 'REWARDED' : 'BOUND',
  createTime: data.createTime ?? undefined,
  rewardTime: data.rewardTime ?? undefined,
});

const mapListInviteRecordsFromApi = (
  data: ListUserInviteRecordsApiResponse
): UserInviteRecordList => {
  const page = assertApiPage(data, isRecord, '用户邀请分页响应契约无效');
  return {
    records: page.list.map(mapInviteRecordFromApi),
    total: page.total,
    page: page.page,
    size: page.size,
    totalPage: page.totalPage,
  };
};

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

function assertTaskRecord(data: unknown): asserts data is UserTaskStatusApiResponse {
  if (
    !isRecord(data) ||
    typeof data.taskCode !== 'string' ||
    typeof data.taskType !== 'string' ||
    typeof data.enabled !== 'boolean' ||
    typeof data.canComplete !== 'boolean'
  )
    invalidApiResponse('用户任务状态契约无效');
  const row = data as UserTaskStatusApiResponse;
  if (row.rewardPreview != null && !isRecord(row.rewardPreview))
    invalidApiResponse('用户任务奖励契约无效');
  if (row.once != null && (!isRecord(row.once) || typeof row.once.completed !== 'boolean'))
    invalidApiResponse('用户任务单次状态契约无效');
  if (
    row.periodic != null &&
    (!isRecord(row.periodic) ||
      typeof row.periodic.completedTimes !== 'number' ||
      typeof row.periodic.maxTimes !== 'number')
  )
    invalidApiResponse('用户任务周期状态契约无效');
}

const mapTaskStatusFromApi = (data: UserTaskStatusApiResponse): UserTaskStatus => {
  assertTaskRecord(data);
  return {
    taskCode: data.taskCode,
    taskType: data.taskType,
    enabled: data.enabled,
    canComplete: data.canComplete,
    rewardPreview: mapTaskRewardPreviewFromApi(data.rewardPreview),
    once: data.once
      ? { completed: data.once.completed, completeTime: data.once.completeTime ?? undefined }
      : undefined,
    periodic: mapTaskPeriodicStatusFromApi(data.periodic),
  };
};

const mapTaskStatusesFromApi = (data: UserTaskStatusApiResponse[]): UserTaskStatus[] => {
  assertApiArray(
    data,
    (value): value is UserTaskStatusApiResponse => {
      try {
        assertTaskRecord(value);
        return true;
      } catch {
        return false;
      }
    },
    '用户任务状态列表契约无效'
  );
  return data.map(mapTaskStatusFromApi);
};

const mapTaskCheckInFromApi = (data: UserTaskCheckInApiResponse): UserTaskCheckInResult => {
  if (
    !isRecord(data) ||
    typeof data.rewardType !== 'string' ||
    typeof data.rewardAmount !== 'number' ||
    typeof data.hitGuarantee !== 'boolean' ||
    typeof data.cycleProgress !== 'number' ||
    typeof data.cycleCount !== 'number' ||
    typeof data.checkedInToday !== 'boolean'
  )
    invalidApiResponse('用户签到响应契约无效');
  return {
    rewardType: data.rewardType,
    rewardAmount: data.rewardAmount,
    hitGuarantee: data.hitGuarantee,
    cycleProgress: data.cycleProgress,
    cycleCount: data.cycleCount,
    checkedInToday: data.checkedInToday,
  };
};

const mapTourStatusesFromApi = (data: UserTourStatusApiResponse[]): UserTourStatus[] =>
  data.map(({ tourCode, completed }) => ({
    tourCode,
    completed: completed === true,
  }));

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
  mapListInviteRecordsRequest,
  mapListInviteRecordsFromApi,
  mapSubmitFeedbackRequest,
  mapTaskStatusesFromApi,
  mapTaskCheckInFromApi,
  mapTourStatusesFromApi,
  mapUpdateUserInfoRequests,
};
