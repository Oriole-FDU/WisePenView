import { executeApiContract } from '@/apis/executeApiContract';

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
  return executeApiContract(LoginApiContract, req, {
    skipUnauthorizedHandling: true,
  });
}

async function logout(): Promise<LogoutApiResponse> {
  return executeApiContract(LogoutApiContract, undefined);
}

async function register(req: RegisterApiRequest): Promise<RegisterApiResponse> {
  return executeApiContract(RegisterApiContract, req);
}

async function forgotPasswordEmail(
  req: ResetPasswordEmailApiRequest
): Promise<ResetPasswordEmailApiResponse> {
  return executeApiContract(ResetPasswordEmailApiContract, req);
}

async function forgotPasswordReset(
  req: ResetPasswordApiRequest
): Promise<ResetPasswordApiResponse> {
  return executeApiContract(ResetPasswordApiContract, req);
}

async function changePassword(req: ChangePasswordApiRequest): Promise<ChangePasswordApiResponse> {
  return executeApiContract(ChangePasswordApiContract, req);
}

export const AuthApi = {
  login,
  logout,
  register,
  forgotPasswordEmail,
  forgotPasswordReset,
  changePassword,
};
