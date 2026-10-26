import { parseApiRequest, parseApiResponse } from '@/apis/contract';
import { apiPost } from '@/apis/request';

import type {
  ChangePasswordApiRequest,
  ChangePasswordApiResponse,
  LoginApiRequest,
  LoginApiResponse,
  LogoutApiResponse,
  RegisterApiRequest,
  RegisterApiResponse,
  ResetPasswordApiRequest,
  ResetPasswordApiResponse,
  ResetPasswordEmailApiRequest,
  ResetPasswordEmailApiResponse,
} from './AuthApi.contract';
import {
  ChangePasswordApiContract,
  LoginApiContract,
  LogoutApiContract,
  RegisterApiContract,
  ResetPasswordApiContract,
  ResetPasswordEmailApiContract,
} from './AuthApi.contract';

async function login(req: LoginApiRequest): Promise<LoginApiResponse> {
  const request = parseApiRequest(LoginApiContract, req);
  const data = await apiPost<unknown>(LoginApiContract.endpoint, request, {
    skipUnauthorizedHandling: true,
  });
  return parseApiResponse(LoginApiContract, data);
}

async function logout(): Promise<LogoutApiResponse> {
  const request = parseApiRequest(LogoutApiContract, undefined);
  const data = await apiPost<unknown>(LogoutApiContract.endpoint, request);
  return parseApiResponse(LogoutApiContract, data);
}

async function register(req: RegisterApiRequest): Promise<RegisterApiResponse> {
  const request = parseApiRequest(RegisterApiContract, req);
  const data = await apiPost<unknown>(RegisterApiContract.endpoint, request);
  return parseApiResponse(RegisterApiContract, data);
}

async function forgotPasswordEmail(
  req: ResetPasswordEmailApiRequest
): Promise<ResetPasswordEmailApiResponse> {
  const request = parseApiRequest(ResetPasswordEmailApiContract, req);
  const data = await apiPost<unknown>(ResetPasswordEmailApiContract.endpoint, request);
  return parseApiResponse(ResetPasswordEmailApiContract, data);
}

async function forgotPasswordReset(
  req: ResetPasswordApiRequest
): Promise<ResetPasswordApiResponse> {
  const request = parseApiRequest(ResetPasswordApiContract, req);
  const data = await apiPost<unknown>(ResetPasswordApiContract.endpoint, request);
  return parseApiResponse(ResetPasswordApiContract, data);
}

async function changePassword(req: ChangePasswordApiRequest): Promise<ChangePasswordApiResponse> {
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
