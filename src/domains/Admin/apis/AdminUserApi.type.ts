import type { PageApiRequest, PageR } from '@/apis/api.type';
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
  status?: UserStatusApiValue;
  createTime?: string;
  updateTime?: string;
}

export interface FetchAdminUserListApiRequest extends PageApiRequest {
  keyword: string;
  status?: UserStatusApiValue;
  identityType?: string;
}

export type FetchAdminUserListApiResponse = PageR<AdminUserApiModel>;

export interface GetAdminUserInfoApiRequest {
  userId: string;
}

export interface GetAdminUserInfoApiResponse {
  sex?: UserSexApiValue;
  university?: string;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: number;
  degreeLevel?: UserDegreeLevelApiValue;
  academicTitle?: string;
  userId?: string | number;
  createTime?: string;
  updateTime?: string;
}

export interface ChangeAdminUserInfoApiRequest {
  userId: string;
  nickname?: string;
  realName?: string;
  avatar?: string;
  email?: string | null;
  mobile?: string | null;
  status?: UserStatusApiValue;
  identityType?: string;
}

export interface ChangeAdminUserProfileApiRequest {
  userId: string;
  sex?: string;
  university?: string | null;
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
