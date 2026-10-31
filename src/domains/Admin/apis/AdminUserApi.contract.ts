import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  ChangeAdminUserInfoApiRequestSchema,
  ChangeAdminUserProfileApiRequestSchema,
  FetchAdminUserListApiRequestSchema,
  FetchAdminUserListApiResponseSchema,
  GetAdminUserInfoApiRequestSchema,
  GetAdminUserInfoApiResponseSchema,
  ResetAdminUserPasswordApiRequestSchema,
} from './AdminUserApi.schema';

export const FetchAdminUserListApiContract = defineApiContract({
  name: 'FetchAdminUserListApi',
  method: 'GET',
  endpoint: '/admin/user/getUserList',
  requestPlacement: 'query',
  transport: 'json',
  request: FetchAdminUserListApiRequestSchema,
  response: FetchAdminUserListApiResponseSchema,
});

export const GetAdminUserInfoApiContract = defineApiContract({
  name: 'GetAdminUserInfoApi',
  method: 'GET',
  endpoint: '/admin/user/getUserInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GetAdminUserInfoApiRequestSchema,
  response: GetAdminUserInfoApiResponseSchema,
});

export const ChangeAdminUserInfoApiContract = defineApiContract({
  name: 'ChangeAdminUserInfoApi',
  method: 'POST',
  endpoint: '/admin/user/changeUserInfo',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeAdminUserInfoApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ChangeAdminUserProfileApiContract = defineApiContract({
  name: 'ChangeAdminUserProfileApi',
  method: 'POST',
  endpoint: '/admin/user/changeUserProfile',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeAdminUserProfileApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ResetAdminUserPasswordApiContract = defineApiContract({
  name: 'ResetAdminUserPasswordApi',
  method: 'POST',
  endpoint: '/admin/user/resetPassword',
  requestPlacement: 'body',
  transport: 'json',
  request: ResetAdminUserPasswordApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type FetchAdminUserListApiContractRequest = ApiContractRequest<
  typeof FetchAdminUserListApiContract
>;
export type FetchAdminUserListApiContractResponse = ApiContractResponse<
  typeof FetchAdminUserListApiContract
>;
export type GetAdminUserInfoApiContractRequest = ApiContractRequest<
  typeof GetAdminUserInfoApiContract
>;
export type GetAdminUserInfoApiContractResponse = ApiContractResponse<
  typeof GetAdminUserInfoApiContract
>;
export type ChangeAdminUserInfoApiContractRequest = ApiContractRequest<
  typeof ChangeAdminUserInfoApiContract
>;
export type ChangeAdminUserProfileApiContractRequest = ApiContractRequest<
  typeof ChangeAdminUserProfileApiContract
>;
export type ResetAdminUserPasswordApiContractRequest = ApiContractRequest<
  typeof ResetAdminUserPasswordApiContract
>;
