import { AdminUserApi } from '../apis/AdminUserApi';
import {
  mapAdminUserApiModelToEntity,
  mapFetchAdminUserListRequestToApi,
  mapFetchAdminUserListResponse,
} from '../mapper/AdminUserServices.map';
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
  const data = await AdminUserApi.getUserList(mapFetchAdminUserListRequestToApi(params));
  return mapFetchAdminUserListResponse(data);
};

const getUserInfo = async (params: GetAdminUserInfoRequest): Promise<GetAdminUserInfoResponse> => {
  const data = await AdminUserApi.getUserInfo(params);
  return {
    user: mapAdminUserApiModelToEntity(data.userInfo),
    userProfile: data.userProfile ?? null,
    readonlyFields: data.readonlyFields ?? null,
  };
};

const changeUserInfo = async (params: ChangeAdminUserInfoRequest): Promise<void> => {
  await AdminUserApi.changeUserInfo(params);
};

const changeUserProfile = async (params: ChangeAdminUserProfileRequest): Promise<void> => {
  await AdminUserApi.changeUserProfile(params);
};

const resetPassword = async (params: ResetAdminUserPasswordRequest): Promise<void> => {
  await AdminUserApi.resetPassword(params);
};

export const createAdminServices = (): IAdminService => ({
  fetchUserList,
  getUserInfo,
  changeUserInfo,
  changeUserProfile,
  resetPassword,
});
