import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';

import {
  ChangePasswordApiRequestSchema,
  EmptyAuthApiRequestSchema,
  EmptyAuthApiResponseSchema,
  LoginApiRequestSchema,
  LoginApiResponseSchema,
  NewPasswordApiRequestSchema,
  RegisterApiRequestSchema,
  ResetPasswordApiRequestSchema,
} from './AuthApi.schema';

export const LoginApiContract = defineApiContract({
  name: 'LoginApi',
  endpoint: '/auth/login',
  request: LoginApiRequestSchema,
  response: LoginApiResponseSchema,
});

export const LogoutApiContract = defineApiContract({
  name: 'LogoutApi',
  endpoint: '/auth/logout',
  request: EmptyAuthApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
});

export const RegisterApiContract = defineApiContract({
  name: 'RegisterApi',
  endpoint: '/auth/register',
  request: RegisterApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
});

export const ResetPasswordEmailApiContract = defineApiContract({
  name: 'ResetPasswordEmailApi',
  endpoint: '/auth/sendResetMail',
  request: ResetPasswordApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
});

export const ResetPasswordApiContract = defineApiContract({
  name: 'ResetPasswordApi',
  endpoint: '/auth/resetPassword',
  request: NewPasswordApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
});

export const ChangePasswordApiContract = defineApiContract({
  name: 'ChangePasswordApi',
  endpoint: '/auth/changePassword',
  request: ChangePasswordApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
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
