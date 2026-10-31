import type { AdminUser } from '@/domains/Admin';
import type { DegreeLevel, Sex, UserStatus } from '@/domains/User';

export interface IAdminService {
  fetchUserList(params: FetchAdminUserListRequest): Promise<FetchAdminUserListResponse>;
  getUserInfo(params: GetAdminUserInfoRequest): Promise<GetAdminUserInfoResponse>;
  changeUserInfo(params: ChangeAdminUserInfoRequest): Promise<void>;
  changeUserProfile(params: ChangeAdminUserProfileRequest): Promise<void>;
  resetPassword(params: ResetAdminUserPasswordRequest): Promise<void>;
}

export interface FetchAdminUserListRequest {
  page: number;
  size: number;
  keyword: string;
  status: UserStatus;
  identityType: 1 | 2 | 3;
}

export interface FetchAdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

export interface GetAdminUserInfoRequest {
  userId: string;
}

export interface GetAdminUserInfoResponse {
  userProfile: Record<string, unknown>;
}

export interface ChangeAdminUserInfoRequest {
  userId: string;
  nickname?: string;
  realName?: string;
  avatar?: string;
  email?: string | null;
  mobile?: string | null;
  status?: UserStatus;
  identityType?: 1 | 2 | 3;
}

export interface ChangeAdminUserProfileRequest {
  userId: string;
  sex?: Sex;
  university?: string | null;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: string;
  degreeLevel?: DegreeLevel;
  academicTitle?: string;
}

export interface ResetAdminUserPasswordRequest {
  userId: string;
  newPassword?: string;
}
