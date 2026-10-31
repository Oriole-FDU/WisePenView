import { executeApiContract } from '@/apis/executeApiContract';

import {
  ChangeAdminUserInfoApiContract,
  type ChangeAdminUserInfoApiContractRequest,
  ChangeAdminUserProfileApiContract,
  type ChangeAdminUserProfileApiContractRequest,
  FetchAdminUserListApiContract,
  type FetchAdminUserListApiContractRequest,
  type FetchAdminUserListApiContractResponse,
  GetAdminUserInfoApiContract,
  type GetAdminUserInfoApiContractRequest,
  type GetAdminUserInfoApiContractResponse,
  ResetAdminUserPasswordApiContract,
  type ResetAdminUserPasswordApiContractRequest,
} from './AdminUserApi.contract';

/** Admin User API: /admin/user/* */

function getUserList(
  req: FetchAdminUserListApiContractRequest
): Promise<FetchAdminUserListApiContractResponse> {
  return executeApiContract(FetchAdminUserListApiContract, req);
}

function getUserInfo(
  req: GetAdminUserInfoApiContractRequest
): Promise<GetAdminUserInfoApiContractResponse> {
  return executeApiContract(GetAdminUserInfoApiContract, req);
}

async function changeUserInfo(req: ChangeAdminUserInfoApiContractRequest): Promise<void> {
  await executeApiContract(ChangeAdminUserInfoApiContract, req);
}

async function changeUserProfile(req: ChangeAdminUserProfileApiContractRequest): Promise<void> {
  await executeApiContract(ChangeAdminUserProfileApiContract, req);
}

async function resetPassword(req: ResetAdminUserPasswordApiContractRequest): Promise<void> {
  await executeApiContract(ResetAdminUserPasswordApiContract, req);
}

export const AdminUserApi = {
  getUserList,
  getUserInfo,
  changeUserInfo,
  changeUserProfile,
  resetPassword,
};
