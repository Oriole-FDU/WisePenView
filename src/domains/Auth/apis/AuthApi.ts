import { parseApiRequest, parseApiResponse } from '@/apis/contract';
import { apiPost } from '@/apis/request';

import {
  ChangePasswordApiContract,
  LoginApiContract,
  LogoutApiContract,
  RegisterApiContract,
  ResetPasswordApiContract,
  ResetPasswordEmailApiContract,
} from './AuthApi.contract';
import type {
  ChangePasswordApiRequest,
  EmptyAuthApiResponse,
  LoginApiRequest,
  LoginApiResponse,
  NewPasswordApiRequest,
  RegisterApiRequest,
  ResetPasswordApiRequest,
} from './AuthApi.schema';

async function login(req: LoginApiRequest): Promise<LoginApiResponse> {
  const request = parseApiRequest(LoginApiContract, req);
  const data = await apiPost<unknown>(LoginApiContract.endpoint, request, {
    skipUnauthorizedHandling: true,
  });
  return parseApiResponse(LoginApiContract, data);
}

async function logout(): Promise<EmptyAuthApiResponse> {
  const request = parseApiRequest(LogoutApiContract, undefined);
  const data = await apiPost<unknown>(LogoutApiContract.endpoint, request);
  return parseApiResponse(LogoutApiContract, data);
}

async function register(req: RegisterApiRequest): Promise<EmptyAuthApiResponse> {
  const request = parseApiRequest(RegisterApiContract, req);
  const data = await apiPost<unknown>(RegisterApiContract.endpoint, request);
  return parseApiResponse(RegisterApiContract, data);
}

async function forgotPasswordEmail(req: ResetPasswordApiRequest): Promise<EmptyAuthApiResponse> {
  const request = parseApiRequest(ResetPasswordEmailApiContract, req);
  const data = await apiPost<unknown>(ResetPasswordEmailApiContract.endpoint, request);
  return parseApiResponse(ResetPasswordEmailApiContract, data);
}

async function forgotPasswordReset(req: NewPasswordApiRequest): Promise<EmptyAuthApiResponse> {
  const request = parseApiRequest(ResetPasswordApiContract, req);
  const data = await apiPost<unknown>(ResetPasswordApiContract.endpoint, request);
  return parseApiResponse(ResetPasswordApiContract, data);
}

async function changePassword(req: ChangePasswordApiRequest): Promise<EmptyAuthApiResponse> {
  const request = parseApiRequest(ChangePasswordApiContract, req);
  const data = await apiPost<unknown>(ChangePasswordApiContract.endpoint, request);
  return parseApiResponse(ChangePasswordApiContract, data);
}

export const AuthApi = {
  login,
  logout,
  register,
  forgotPasswordEmail,
  forgotPasswordReset,
  changePassword,
};
