import { apiGet, apiPost, apiPut } from '@/apis/request';
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
  return apiGet('/admin/user/getUserList', { params: req });
}

function getUserInfo(req: GetAdminUserInfoApiRequest): Promise<GetAdminUserInfoApiResponse> {
  return apiGet('/admin/user/getUserInfo', { params: req });
}

function changeUserInfo(req: ChangeAdminUserInfoApiRequest): Promise<void> {
  return apiPut('/admin/user/changeUserInfo', req);
}

function changeUserProfile(req: ChangeAdminUserProfileApiRequest): Promise<void> {
  return apiPut('/admin/user/changeUserProfile', req);
}

function resetPassword(req: ResetAdminUserPasswordApiRequest): Promise<void> {
  return apiPost('/admin/user/resetPassword', null, { params: req });
}

export const AdminUserApi = {
  getUserList,
  getUserInfo,
  changeUserInfo,
  changeUserProfile,
  resetPassword,
};
