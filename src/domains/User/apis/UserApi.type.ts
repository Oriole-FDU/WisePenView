import type { Nullable, PageApiRequest, PageR } from '@/apis/api.type';
import type { UserVerificationMode } from '@/domains/User';

export type UserIdentityTypeApiValue = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type UserStatusApiValue = 'NORMAL' | 'UNIDENTIFIED' | 'BANNED';
export type UserSexApiValue = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type UserDegreeLevelApiValue = 'UNKNOWN' | 'UNDERGRADUATE' | 'MASTER' | 'DOCTOR';
export type UserVerificationProviderApiValue = 'FUDAN_UIS';

export interface UserDisplayBaseApiResponse {
  nickname: string;
  username: string;
  realName: Nullable<string>;
  avatar: Nullable<string>;
  identityType: UserIdentityTypeApiValue;
  campusNo: Nullable<string>;
  email: Nullable<string>;
  mobile: Nullable<string>;
}

interface GetUserInfoApiResponseUserInfo {
  nickname: string;
  realName: Nullable<string>;
  avatar: Nullable<string>;
  identityType: UserIdentityTypeApiValue;
  username: string;
  campusNo: Nullable<string>;
  email: Nullable<string>;
  mobile: Nullable<string>;
  verificationMode: Nullable<UserVerificationMode>;
  verificationProviderCode: Nullable<UserVerificationProviderApiValue>;
  userStatus: UserStatusApiValue;
}

interface GetUserInfoApiResponseUserProfile {
  sex: Nullable<UserSexApiValue>;
  inviteCode: Nullable<string>;
  university: Nullable<string>;
  college: Nullable<string>;
  major: Nullable<string>;
  className: Nullable<string>;
  enrollmentYear: Nullable<number>;
  degreeLevel: Nullable<UserDegreeLevelApiValue>;
  academicTitle: Nullable<string>;
}

export interface GetUserInfoApiResponse {
  userId: string;
  userInfo: GetUserInfoApiResponseUserInfo;
  userProfile: GetUserInfoApiResponseUserProfile;
  readonlyFields: string[];
}

export interface SearchUserApiRequest {
  keyword: string;
}

export interface ListUserSearchSuggestionsApiRequest {
  keyword: string;
  size?: number;
}

export interface UserSearchUserApiResponse extends Omit<UserDisplayBaseApiResponse, 'username'> {
  userId: string;
  username: string;
}

export interface ChangeUserInfoApiRequest {
  nickname?: string;
  realName?: string;
  avatar?: string;
}

export interface ChangeUserProfileApiRequest {
  sex?: string;
  university?: Nullable<string>;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: number;
  degreeLevel?: string;
  academicTitle?: string;
}

export interface InitiateEmailVerifyApiRequest {
  email: string;
}

export interface InitiateFudanUISVerifyApiRequest {
  uisAccount: string;
  uisPassword: string;
}

export interface CheckFudanUISVerifyApiResponse {
  completed: boolean;
  requireAction: boolean;
  actionPayload: Nullable<string>;
  message: Nullable<string>;
}

export interface CheckEmailVerifyApiRequest {
  token: string;
}

/** 用户邀请 API: /user/invite/* */

export type UserInviteStatusApiValue = 'BOUND' | 'REWARDED';

export type ListUserInviteRecordsApiRequest = PageApiRequest;

export interface UserInviteRecordApiResponse {
  id: string;
  inviteeUserId: string;
  inviteeDisplay: Nullable<UserDisplayBaseApiResponse>;
  status: UserInviteStatusApiValue;
  createTime: number;
  rewardTime: Nullable<number>;
}

export type ListUserInviteRecordsApiResponse = PageR<UserInviteRecordApiResponse>;

export interface AddFeedbackApiRequest {
  content: string;
  contact: string;
  imageUrl?: string;
  bugReport: boolean;
  suggestion: boolean;
  consultation: boolean;
  complaint: boolean;
  other: boolean;
}
