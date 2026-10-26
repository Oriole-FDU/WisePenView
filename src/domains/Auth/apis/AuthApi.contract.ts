import type { ApiContract } from '@/apis/contract';

import type {
  ChangePasswordApiRequest,
  EmptyAuthApiRequest,
  EmptyAuthApiResponse,
  LoginApiRequest,
  LoginApiResponse,
  NewPasswordApiRequest,
  RegisterApiRequest,
  ResetPasswordApiRequest,
} from './AuthApi.schema';
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

export const LoginApiContract = {
  name: 'LoginApi',
  endpoint: '/auth/login',
  request: LoginApiRequestSchema,
  response: LoginApiResponseSchema,
} as const satisfies ApiContract<LoginApiRequest, LoginApiResponse>;

export const LogoutApiContract = {
  name: 'LogoutApi',
  endpoint: '/auth/logout',
  request: EmptyAuthApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
} as const satisfies ApiContract<EmptyAuthApiRequest, EmptyAuthApiResponse>;

export const RegisterApiContract = {
  name: 'RegisterApi',
  endpoint: '/auth/register',
  request: RegisterApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
} as const satisfies ApiContract<RegisterApiRequest, EmptyAuthApiResponse>;

export const ResetPasswordEmailApiContract = {
  name: 'ResetPasswordEmailApi',
  endpoint: '/auth/sendResetMail',
  request: ResetPasswordApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
} as const satisfies ApiContract<ResetPasswordApiRequest, EmptyAuthApiResponse>;

export const ResetPasswordApiContract = {
  name: 'ResetPasswordApi',
  endpoint: '/auth/resetPassword',
  request: NewPasswordApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
} as const satisfies ApiContract<NewPasswordApiRequest, EmptyAuthApiResponse>;

export const ChangePasswordApiContract = {
  name: 'ChangePasswordApi',
  endpoint: '/auth/changePassword',
  request: ChangePasswordApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
} as const satisfies ApiContract<ChangePasswordApiRequest, EmptyAuthApiResponse>;
