import type { AdminMessage, User, UserAccountProfile, UserSearchUser } from '@/domains/User';
import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  AddFeedbackApiRequest,
  AdminMessageApiModel,
  ChangeUserInfoApiRequest,
  ChangeUserProfileApiRequest,
  CheckEmailVerifyApiRequest,
  GetUserInfoApiResponse,
  InitiateEmailVerifyApiRequest,
  InitiateFudanUISVerifyApiRequest,
  ListAdminMessagesApiRequest,
  ListAdminMessagesApiResponse,
  ListUserSearchSuggestionsApiRequest,
  PublishMessageApiRequest,
  SearchUserApiRequest,
  UserSearchUserApiResponse,
} from '../apis/UserApi.type';
import { FEEDBACK_TYPE, type FeedbackType } from '../enum';
import type {
  ConfirmEmailVerifyRequest,
  FudanUISVerifyStatusData,
  InitiateUISVerifyRequest,
  ListAdminMessagesRequest,
  ListAdminMessagesResponse,
  ListUserSearchSuggestionsRequest,
  PublishMessageRequest,
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

const mapAdminMessageApiModelToEntity = (raw: AdminMessageApiModel): AdminMessage => ({
  messageId: normalizeId(raw.messageId),
  deliveryScope: raw.deliveryScope ?? undefined,
  messageType: raw.messageType ?? undefined,
  title: raw.title ?? undefined,
  content: raw.content ?? undefined,
  jumpUrl: raw.jumpUrl ?? undefined,
  extra: raw.extra ?? undefined,
  readCount: raw.readCount ?? 0,
  createTime: raw.createTime ?? undefined,
});

const mapListAdminMessagesRequest = (
  params: ListAdminMessagesRequest
): ListAdminMessagesApiRequest => ({
  page: params.page,
  size: params.size,
});

const mapListAdminMessagesFromApi = (
  data: ListAdminMessagesApiResponse
): ListAdminMessagesResponse => ({
  messages: data.list.map(mapAdminMessageApiModelToEntity),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});

const mapPublishMessageRequest = (params: PublishMessageRequest): PublishMessageApiRequest => ({
  receiverUserIds: params.receiverUserIds,
  deliveryScope: params.deliveryScope,
  messageType: params.deliveryScope === 'ALL_USERS' ? 'SYSTEM' : params.messageType,
  title: params.title,
  content: params.content,
  jumpUrl: params.jumpUrl,
  extra: params.extra,
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
  mapListAdminMessagesRequest,
  mapListAdminMessagesFromApi,
  mapPublishMessageRequest,
  mapSubmitFeedbackRequest,
  mapUpdateUserInfoRequests,
};
