import type { DegreeLevel, UserVerificationMode } from '@/domains/User';

export interface GetUserInfoApiResponseUserInfo {
  id?: string;
  nickname: string | null;
  realName: string | null;
  avatar: string | null;
  identityType: number;
  username: string;
  campusNo: string;
  email: string | null;
  mobile: string | null;
  verificationMode: UserVerificationMode | null;
  status: number;
}

export interface GetUserInfoApiResponseUserProfile {
  sex: number;
  university: string | null;
  college: string | null;
  major: string | null;
  className: string | null;
  enrollmentYear: string | null;
  degreeLevel: DegreeLevel | null;
  academicTitle: string | null;
}

export interface GetUserInfoApiResponse {
  userInfo: GetUserInfoApiResponseUserInfo;
  userProfile: GetUserInfoApiResponseUserProfile;
  readonlyFields: string[] | null;
}

export interface ChangeUserInfoApiRequest {
  nickname?: string;
  realName?: string;
  avatar?: string;
}

export interface ChangeUserProfileApiRequest {
  sex?: number;
  university?: string | null;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: string;
  degreeLevel?: DegreeLevel;
  academicTitle?: string;
}

export interface InitiateEmailVerifyApiRequest {
  email: string;
}

export interface InitiateFudanUISVerifyApiRequest {
  uisAccount: string;
  uisPassword: string;
}

export interface CheckEmailVerifyApiRequest {
  token: string;
}

export interface RedeemVoucherApiRequest {
  voucherCode: string;
}

export type ListTransactionsApiRequest = Record<string, string | number | undefined>;

export interface TransferTokenBetweenGroupAndUserApiRequest {
  groupId: string;
  tokenCount: number;
  tokenTransferType: 1 | 2;
}
