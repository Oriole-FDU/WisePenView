import type { Nullable, PageApiRequest, PageR } from '@/apis/api.type';
import type {
  UserDegreeLevelApiValue,
  UserIdentityTypeApiValue,
  UserSexApiValue,
  UserStatusApiValue,
} from '@/domains/User/apis/UserApi.type';
import type { UserVerificationMode } from '@/domains/User/enum';

export interface AdminUserApiModel {
  userId?: string | number;
  username?: string;
  nickname?: string;
  realName?: string;
  avatar?: string;
  identityType?: UserIdentityTypeApiValue;
  campusNo?: string;
  email?: string;
  mobile?: string;
  verificationMode?: UserVerificationMode;
  userStatus?: UserStatusApiValue;
  createTime?: string;
  updateTime?: string;
}

export interface FetchAdminUserListApiRequest extends PageApiRequest {
  keyword: string;
  userStatus?: string;
  identityType?: string;
}

export type FetchAdminUserListApiResponse = PageR<AdminUserApiModel>;

export interface GetAdminUserInfoApiRequest {
  userId: string;
}

export interface GetAdminUserInfoApiResponse {
  userId: string | number;
  sex?: Nullable<UserSexApiValue>;
  university?: Nullable<string>;
  college?: Nullable<string>;
  major?: Nullable<string>;
  className?: Nullable<string>;
  enrollmentYear?: Nullable<number>;
  degreeLevel?: Nullable<UserDegreeLevelApiValue>;
  academicTitle?: Nullable<string>;
  createTime?: Nullable<string>;
  updateTime?: Nullable<string>;
}

export interface ChangeAdminUserInfoApiRequest {
  userId: string;
  nickname?: string;
  realName?: string;
  avatar?: string;
  email?: Nullable<string>;
  mobile?: Nullable<string>;
  userStatus?: string;
  identityType?: string;
}

export interface ChangeAdminUserProfileApiRequest {
  userId: string;
  sex?: string;
  university?: Nullable<string>;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: number;
  degreeLevel?: string;
  academicTitle?: string;
}

export interface ResetAdminUserPasswordApiRequest {
  userId: string;
  newPassword?: string;
}
