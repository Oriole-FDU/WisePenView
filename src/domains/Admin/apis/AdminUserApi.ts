import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';

import type {
  ChangeAdminUserInfoApiRequest,
  ChangeAdminUserProfileApiRequest,
  FetchAdminUserListApiRequest,
  FetchAdminUserListApiResponse,
  GetAdminUserInfoApiRequest,
  GetAdminUserInfoApiResponse,
  ResetAdminUserPasswordApiRequest,
} from './AdminUserApi.type';

/** Admin User API: /admin/user/* */

function getUserList(req: FetchAdminUserListApiRequest): Promise<FetchAdminUserListApiResponse> {
  return apiGetUnchecked('/admin/user/getUserList', { params: req });
}

function getUserInfo(req: GetAdminUserInfoApiRequest): Promise<GetAdminUserInfoApiResponse> {
  return apiGetUnchecked('/admin/user/getUserInfo', { params: req });
}

function changeUserInfo(req: ChangeAdminUserInfoApiRequest): Promise<void> {
  return apiPostUnchecked('/admin/user/changeUserInfo', req);
}

function changeUserProfile(req: ChangeAdminUserProfileApiRequest): Promise<void> {
  return apiPostUnchecked('/admin/user/changeUserProfile', req);
}

function resetPassword(req: ResetAdminUserPasswordApiRequest): Promise<void> {
  return apiPostUnchecked('/admin/user/resetPassword', req);
}

export const AdminUserApi = {
  getUserList,
  getUserInfo,
  changeUserInfo,
  changeUserProfile,
  resetPassword,
};
