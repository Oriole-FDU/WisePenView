import type { Nullable, PageApiRequest, PageR } from '@/apis/api.type';
import type {
  UserDegreeLevelApiValue,
  UserIdentityTypeApiValue,
  UserSexApiValue,
  UserStatusApiValue,
} from '@/domains/User/apis/UserApi.type';
import type { UserVerificationMode } from '@/domains/User/enum';

export interface AdminUserApiModel {
  userId: string;
  username: string;
  nickname: string;
  realName: Nullable<string>;
  avatar: Nullable<string>;
  identityType: UserIdentityTypeApiValue;
  campusNo: Nullable<string>;
  email: Nullable<string>;
  mobile: Nullable<string>;
  verificationMode: Nullable<UserVerificationMode>;
  verificationProviderCode: Nullable<string>;
  userStatus: UserStatusApiValue;
  createTime: Nullable<number>;
  updateTime: Nullable<number>;
}

export interface FetchAdminUserListApiRequest extends PageApiRequest {
  keyword: string;
  status?: string;
  identityType?: string;
}

export type FetchAdminUserListApiResponse = PageR<AdminUserApiModel>;

export interface GetAdminUserInfoApiRequest {
  userId: string;
}

export interface GetAdminUserInfoApiResponse {
  userId: string;
  sex: Nullable<UserSexApiValue>;
  inviteCode: Nullable<string>;
  university: Nullable<string>;
  college: Nullable<string>;
  major: Nullable<string>;
  className: Nullable<string>;
  enrollmentYear: Nullable<number>;
  degreeLevel: Nullable<UserDegreeLevelApiValue>;
  academicTitle: Nullable<string>;
  createTime: Nullable<number>;
  updateTime: Nullable<number>;
}

export interface ChangeAdminUserInfoApiRequest {
  userId: string;
  username?: string;
  nickname?: string;
  realName?: string;
  avatar?: string;
  email?: Nullable<string>;
  mobile?: Nullable<string>;
  campusNo?: Nullable<string>;
  verificationMode?: Nullable<UserVerificationMode>;
  verificationProviderCode?: Nullable<string>;
  userStatus?: UserStatusApiValue;
  identityType?: UserIdentityTypeApiValue;
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
