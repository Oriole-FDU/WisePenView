import type { PageApiRequest, PageR } from '@/apis/api.type';
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
  realName: string | null;
  avatar: string | null;
  identityType: UserIdentityTypeApiValue;
  campusNo: string | null;
  email: string | null;
  mobile: string | null;
  verificationMode: UserVerificationMode | null;
  verificationProviderCode: string | null;
  userStatus: UserStatusApiValue;
  createTime: number | null;
  updateTime: number | null;
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
  sex: UserSexApiValue | null;
  inviteCode: string | null;
  university: string | null;
  college: string | null;
  major: string | null;
  className: string | null;
  enrollmentYear: number | null;
  degreeLevel: UserDegreeLevelApiValue | null;
  academicTitle: string | null;
  createTime: number | null;
  updateTime: number | null;
}

export interface ChangeAdminUserInfoApiRequest {
  userId: string;
  username?: string;
  nickname?: string;
  realName?: string;
  avatar?: string;
  email?: string | null;
  mobile?: string | null;
  campusNo?: string | null;
  verificationMode?: UserVerificationMode | null;
  verificationProviderCode?: string | null;
  userStatus?: UserStatusApiValue;
  identityType?: UserIdentityTypeApiValue;
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
