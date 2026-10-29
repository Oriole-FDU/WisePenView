import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiRequestSchema, EmptyApiResponseSchema } from '@/apis/schema';

import {
  ChangePasswordApiRequestSchema,
  LoginApiRequestSchema,
  LoginApiResponseSchema,
  NewPasswordApiRequestSchema,
  RegisterApiRequestSchema,
  ResetPasswordApiRequestSchema,
} from './AuthApi.schema';

export const LoginApiContract = defineApiContract({
  name: 'LoginApi',
  method: 'POST',
  endpoint: '/auth/login',
  requestPlacement: 'body',
  transport: 'json',
  request: LoginApiRequestSchema,
  response: LoginApiResponseSchema,
});

export const LogoutApiContract = defineApiContract({
  name: 'LogoutApi',
  method: 'POST',
  endpoint: '/auth/logout',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const RegisterApiContract = defineApiContract({
  name: 'RegisterApi',
  method: 'POST',
  endpoint: '/auth/register',
  requestPlacement: 'body',
  transport: 'json',
  request: RegisterApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ResetPasswordEmailApiContract = defineApiContract({
  name: 'ResetPasswordEmailApi',
  method: 'POST',
  endpoint: '/auth/sendResetMail',
  requestPlacement: 'body',
  transport: 'json',
  request: ResetPasswordApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ResetPasswordApiContract = defineApiContract({
  name: 'ResetPasswordApi',
  method: 'POST',
  endpoint: '/auth/resetPassword',
  requestPlacement: 'body',
  transport: 'json',
  request: NewPasswordApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ChangePasswordApiContract = defineApiContract({
  name: 'ChangePasswordApi',
  method: 'POST',
  endpoint: '/auth/changePassword',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangePasswordApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type LoginApiRequest = ApiContractRequest<typeof LoginApiContract>;
export type LoginApiResponse = ApiContractResponse<typeof LoginApiContract>;
export type LogoutApiRequest = ApiContractRequest<typeof LogoutApiContract>;
export type LogoutApiResponse = ApiContractResponse<typeof LogoutApiContract>;
export type RegisterApiRequest = ApiContractRequest<typeof RegisterApiContract>;
export type RegisterApiResponse = ApiContractResponse<typeof RegisterApiContract>;
export type ResetPasswordEmailApiRequest = ApiContractRequest<typeof ResetPasswordEmailApiContract>;
export type ResetPasswordEmailApiResponse = ApiContractResponse<
  typeof ResetPasswordEmailApiContract
>;
export type ResetPasswordApiRequest = ApiContractRequest<typeof ResetPasswordApiContract>;
export type ResetPasswordApiResponse = ApiContractResponse<typeof ResetPasswordApiContract>;
export type ChangePasswordApiRequest = ApiContractRequest<typeof ChangePasswordApiContract>;
export type ChangePasswordApiResponse = ApiContractResponse<typeof ChangePasswordApiContract>;
