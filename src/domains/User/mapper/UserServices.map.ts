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
  InitiateEmailVerifyApiRequest,
  InitiateFudanUISVerifyApiRequest,
  ListUserInviteRecordsApiRequest,
  ListUserInviteRecordsApiResponse,
  UserInviteRecordApiResponse,
} from '../apis/AccountApi.schema';
import type {
  GetUserInfoApiResponse,
  SearchUsersApiResponse,
} from '../apis/UserInformationApi.contract';
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
import type {
  ConfirmEmailVerifyRequest,
  FudanUISVerifyStatusData,
  InitiateUISVerifyRequest,
  ListUserInviteRecordsRequest,
  SendEmailVerifyRequest,
  SubmitFeedbackRequest,
  UpdateUserInfoRequest,
} from '../service/index.type';
import { normalizeIdentityTypeFromApi, normalizeUserDisplayBaseFromApi } from './userEnum.mapper';

type CachedUserSafe = Pick<
  User,
  'id' | 'username' | 'nickname' | 'avatar' | 'identityType' | 'realName' | 'inviteCode'
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
      campusNo: userInfo.campusNo ?? undefined,
      email: userInfo.email ?? undefined,
      mobile: userInfo.mobile ?? undefined,
      verificationMode: userInfo.verificationMode,
      verificationProviderCode: userInfo.verificationProviderCode,
      status: userInfo.userStatus,
    },
    userProfile: {
      sex: userProfile.sex ?? undefined,
      inviteCode: userProfile.inviteCode ?? undefined,
      university: userProfile.university,
      college: userProfile.college ?? undefined,
      major: userProfile.major ?? undefined,
      className: userProfile.className ?? undefined,
      enrollmentYear:
        userProfile.enrollmentYear == null ? undefined : String(userProfile.enrollmentYear),
      degreeLevel: userProfile.degreeLevel ?? undefined,
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

const mapSearchUserFromApi = (data: SearchUsersApiResponse[number]): UserSearchUser => {
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

const mapSearchUsersFromApi = (data: SearchUsersApiResponse): UserSearchUser[] =>
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
): UserInviteRecordList => ({
  records: data.list.map(mapInviteRecordFromApi),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});

const mapSubmitFeedbackRequest = (params: SubmitFeedbackRequest): AddFeedbackApiRequest => ({
  content: params.content,
  contact: params.contact,
  imageUrl: params.imageUrl?.trim() || undefined,
  browser: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
  type: params.type,
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
  if (params.sex !== undefined) userProfilePayload.sex = params.sex;
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
    userProfilePayload.degreeLevel = params.degreeLevel;
  }
  if (params.academicTitle !== undefined) userProfilePayload.academicTitle = params.academicTitle;

  return { userInfoPayload, userProfilePayload };
};

export const UserServicesMap = {
  mapAccountProfileFromApi,
  mapUserSafeFromAccountProfile,
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
