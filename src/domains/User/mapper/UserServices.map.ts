import type {
  User,
  UserAccountProfile,
  UserInviteRecord,
  UserInviteRecordList,
  UserSearchUser,
} from '@/domains/User';

import type {
  AddFeedbackApiRequest,
  ChangeUserInfoApiRequest,
  ChangeUserProfileApiRequest,
  ListUserInviteRecordsApiResponse,
  UserInviteRecordApiResponse,
} from '../apis/AccountApi.schema';
import type {
  GetUserInfoApiResponse,
  SearchUsersApiResponse,
} from '../apis/UserInformationApi.contract';
import type { SubmitFeedbackRequest, UpdateUserInfoRequest } from '../service/index.type';
import { normalizeUserDisplayBaseFromApi } from './userEnum.mapper';

type CachedUserSafe = Pick<
  User,
  'id' | 'username' | 'nickname' | 'avatar' | 'identityType' | 'realName' | 'inviteCode'
>;

const mapAccountProfileFromApi = (data: GetUserInfoApiResponse): UserAccountProfile => {
  const { userInfo, userProfile } = data;
  return {
    id: data.userId,
    userInfo: {
      nickname: userInfo.nickname ?? undefined,
      realName: userInfo.realName ?? undefined,
      avatar: userInfo.avatar ?? undefined,
      identityType: userInfo.identityType,
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
    userId: data.userId,
    username: data.username,
    nickname: displayInfo?.nickname,
    realName: displayInfo?.realName,
    avatar: displayInfo?.avatar,
    identityType: displayInfo?.identityType,
  };
};

const mapSearchUsersFromApi = (data: SearchUsersApiResponse): UserSearchUser[] =>
  data.map(mapSearchUserFromApi);

const mapInviteRecordFromApi = (data: UserInviteRecordApiResponse): UserInviteRecord => ({
  id: data.id,
  inviteeUserId: data.inviteeUserId,
  invitee: normalizeUserDisplayBaseFromApi(data.inviteeDisplay),
  status: data.status,
  createTime: data.createTime,
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
  mapListInviteRecordsFromApi,
  mapSubmitFeedbackRequest,
  mapUpdateUserInfoRequests,
};
