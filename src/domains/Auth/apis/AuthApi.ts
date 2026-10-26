import { parseApiRequest, parseApiResponse } from '@/apis/contract';
import { apiPost } from '@/apis/request';

import type {
  ChangePasswordApiRequest,
  EmptyAuthApiResponse,
  LoginApiRequest,
  LoginApiResponse,
  NewPasswordApiRequest,
  RegisterApiRequest,
  ResetPasswordApiRequest,
} from './AuthApi.schema';
import {
  ChangePasswordApiRequestSchema,
  EmptyAuthApiResponseSchema,
  LoginApiRequestSchema,
  LoginApiResponseSchema,
  NewPasswordApiRequestSchema,
  RegisterApiRequestSchema,
  ResetPasswordApiRequestSchema,
} from './AuthApi.schema';

const AUTH_ENDPOINTS = {
  login: '/auth/login',
  logout: '/auth/logout',
  register: '/auth/register',
  resetPasswordEmail: '/auth/sendResetMail',
  resetPassword: '/auth/resetPassword',
  changePassword: '/auth/changePassword',
} as const;

async function login(req: LoginApiRequest): Promise<LoginApiResponse> {
  const request = parseApiRequest(LoginApiRequestSchema, req, {
    contract: 'LoginApiRequest',
    endpoint: AUTH_ENDPOINTS.login,
  });
  const data = await apiPost<unknown>(AUTH_ENDPOINTS.login, request, {
    skipUnauthorizedHandling: true,
  });
  return parseApiResponse(LoginApiResponseSchema, data, {
    contract: 'LoginApiResponse',
    endpoint: AUTH_ENDPOINTS.login,
  });
}

async function logout(): Promise<EmptyAuthApiResponse> {
  const data = await apiPost<unknown>(AUTH_ENDPOINTS.logout);
  return parseApiResponse(EmptyAuthApiResponseSchema, data, {
    contract: 'EmptyAuthApiResponse',
    endpoint: AUTH_ENDPOINTS.logout,
  });
}

async function register(req: RegisterApiRequest): Promise<EmptyAuthApiResponse> {
  const request = parseApiRequest(RegisterApiRequestSchema, req, {
    contract: 'RegisterApiRequest',
    endpoint: AUTH_ENDPOINTS.register,
  });
  const data = await apiPost<unknown>(AUTH_ENDPOINTS.register, request);
  return parseApiResponse(EmptyAuthApiResponseSchema, data, {
    contract: 'EmptyAuthApiResponse',
    endpoint: AUTH_ENDPOINTS.register,
  });
}

async function forgotPasswordEmail(req: ResetPasswordApiRequest): Promise<EmptyAuthApiResponse> {
  const request = parseApiRequest(ResetPasswordApiRequestSchema, req, {
    contract: 'ResetPasswordApiRequest',
    endpoint: AUTH_ENDPOINTS.resetPasswordEmail,
  });
  const data = await apiPost<unknown>(AUTH_ENDPOINTS.resetPasswordEmail, request);
  return parseApiResponse(EmptyAuthApiResponseSchema, data, {
    contract: 'EmptyAuthApiResponse',
    endpoint: AUTH_ENDPOINTS.resetPasswordEmail,
  });
}

async function forgotPasswordReset(req: NewPasswordApiRequest): Promise<EmptyAuthApiResponse> {
  const request = parseApiRequest(NewPasswordApiRequestSchema, req, {
    contract: 'NewPasswordApiRequest',
    endpoint: AUTH_ENDPOINTS.resetPassword,
  });
  const data = await apiPost<unknown>(AUTH_ENDPOINTS.resetPassword, request);
  return parseApiResponse(EmptyAuthApiResponseSchema, data, {
    contract: 'EmptyAuthApiResponse',
    endpoint: AUTH_ENDPOINTS.resetPassword,
  });
}

async function changePassword(req: ChangePasswordApiRequest): Promise<EmptyAuthApiResponse> {
  const request = parseApiRequest(ChangePasswordApiRequestSchema, req, {
    contract: 'ChangePasswordApiRequest',
    endpoint: AUTH_ENDPOINTS.changePassword,
  });
  const data = await apiPost<unknown>(AUTH_ENDPOINTS.changePassword, request);
  return parseApiResponse(EmptyAuthApiResponseSchema, data, {
    contract: 'EmptyAuthApiResponse',
    endpoint: AUTH_ENDPOINTS.changePassword,
  });
}

export const AuthApi = {
  login,
  logout,
  register,
  forgotPasswordEmail,
  forgotPasswordReset,
  changePassword,
};
