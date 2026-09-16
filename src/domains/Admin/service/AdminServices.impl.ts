import { AdminUserApi } from '@domain-apis';
import { AdminUserServicesMap } from '../mapper/AdminUserServices.map';
import type {
  ChangeAdminUserInfoRequest,
  ChangeAdminUserProfileRequest,
  FetchAdminUserListRequest,
  FetchAdminUserListResponse,
  GetAdminUserInfoRequest,
  GetAdminUserInfoResponse,
  IAdminService,
  ResetAdminUserPasswordRequest,
} from './index.type';

const fetchUserList = async (
  params: FetchAdminUserListRequest
): Promise<FetchAdminUserListResponse> => {
  const query = AdminUserServicesMap.mapFetchAdminUserListRequest(params);
  const data = await AdminUserApi.getUserList(query);
  return AdminUserServicesMap.mapFetchAdminUserListFromApi(data);
};

const getUserInfo = async (params: GetAdminUserInfoRequest): Promise<GetAdminUserInfoResponse> => {
  const data = await AdminUserApi.getUserInfo(params);
  return AdminUserServicesMap.mapGetAdminUserInfoFromApi(data);
};

const changeUserInfo = async (params: ChangeAdminUserInfoRequest): Promise<void> => {
  await AdminUserApi.changeUserInfo(AdminUserServicesMap.mapChangeAdminUserInfoRequest(params));
};

const changeUserProfile = async (params: ChangeAdminUserProfileRequest): Promise<void> => {
  await AdminUserApi.changeUserProfile(
    AdminUserServicesMap.mapChangeAdminUserProfileRequest(params)
  );
};

const resetPassword = async (params: ResetAdminUserPasswordRequest): Promise<void> => {
  await AdminUserApi.resetPassword(AdminUserServicesMap.mapResetAdminUserPasswordRequest(params));
};

export const createAdminServices = (): IAdminService => ({
  fetchUserList,
  getUserInfo,
  changeUserInfo,
  changeUserProfile,
  resetPassword,
});
