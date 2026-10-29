import type { NumericEnumApiValue, PageApiRequest, PageR } from '@/apis/api.type';

/** 尚未迁移的接口保留宽松枚举兼容；UserInformation 契约使用严格数字 code。 */
export type UserIdentityTypeApiValue = NumericEnumApiValue<1 | 2 | 3>;
export type UserStatusApiValue = 'NORMAL' | 'UNIDENTIFIED' | 'BANNED';
export type UserSexApiValue = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type UserDegreeLevelApiValue = 'UNKNOWN' | 'UNDERGRADUATE' | 'MASTER' | 'DOCTOR';
export type UserVerificationProviderApiValue = 'FUDAN_UIS';

export interface UserDisplayBaseApiResponse {
  nickname?: string | null;
  username?: string | null;
  realName?: string | null;
  avatar?: string | null;
  identityType?: UserIdentityTypeApiValue | null;
  campusNo?: string | null;
  email?: string | null;
  mobile?: string | null;
}

export interface UserSearchUserApiResponse extends UserDisplayBaseApiResponse {
  userId: string | number;
  username: string;
}

export interface ChangeUserInfoApiRequest {
  nickname?: string;
  realName?: string;
  avatar?: string;
}

export interface ChangeUserProfileApiRequest {
  sex?: string;
  university?: string | null;
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
  completed?: boolean | null;
  requireAction?: boolean | null;
  actionPayload?: string | null;
  message?: string | null;
}

export interface CheckEmailVerifyApiRequest {
  token: string;
}

/** 用户邀请 API: /user/invite/* */

export type UserInviteStatusApiValue = 'BOUND' | 'REWARDED';

export type ListUserInviteRecordsApiRequest = PageApiRequest;

export interface UserInviteRecordApiResponse {
  id?: string | number | null;
  inviteeUserId?: string | number | null;
  inviteeDisplay?: UserDisplayBaseApiResponse | null;
  status?: UserInviteStatusApiValue | null;
  createTime?: string | null;
  rewardTime?: string | null;
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
