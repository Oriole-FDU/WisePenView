import type { AdminUser } from '@/domains/Admin';

import type { AdminMessage } from '../entity/message';

export interface IAdminService {
  listAdminMessages(params: ListAdminMessagesRequest): Promise<ListAdminMessagesResponse>;
  publishMessage(params: PublishMessageRequest): Promise<void>;

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
  status: number;
  identityType: number;
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
  status?: number;
  identityType?: number;
}

export interface ChangeAdminUserProfileRequest {
  userId: string;
  sex?: number;
  university?: string | null;
  college?: string;
  major?: string;
  className?: string;
  enrollmentYear?: string;
  degreeLevel?: number;
  academicTitle?: string;
}

export interface ResetAdminUserPasswordRequest {
  userId: string;
  newPassword?: string;
}

export interface ListAdminMessagesRequest {
  page: number;
  size: number;
}

export interface ListAdminMessagesResponse {
  messages: AdminMessage[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

export type PublishMessageDeliveryScope = 'DIRECT' | 'ALL_USERS';
export type PublishMessageType = 'SYSTEM' | 'NORMAL';

export interface PublishMessageRequest {
  receiverUserIds: string[];
  deliveryScope: PublishMessageDeliveryScope;
  messageType: PublishMessageType;
  title: string;
  content: string;
  jumpUrl?: string;
  extra?: string;
}
