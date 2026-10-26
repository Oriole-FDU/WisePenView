import { AuthApi } from '@domain-apis';

import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';

import { normalizeRegisterRequest } from '../utils/normalizeRegisterRequest';
import type {
  ChangePasswordRequest,
  LoginRequest,
  NewPasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from './AuthService.type';
import type { IAuthService } from './index.type';

const login = async (params: LoginRequest) => {
  await AuthApi.login(params);
  authSessionCoordinator.publish('login');
};

const logout = async () => {
  await AuthApi.logout();
  authSessionCoordinator.publish('logout');
};

const register = async (params: RegisterRequest) => {
  // 归一化注册请求，去除首尾空白并统一邀请码为大写
  const registerRequest = normalizeRegisterRequest(params);
  await AuthApi.register(registerRequest);
};

const resetPassword = async (params: ResetPasswordRequest) => {
  await AuthApi.forgotPasswordEmail(params);
};

const newPassword = async (params: NewPasswordRequest) => {
  await AuthApi.forgotPasswordReset(params);
};

const changePassword = async (params: ChangePasswordRequest) => {
  await AuthApi.changePassword(params);
};

export const createAuthServices = (): IAuthService => ({
  login,
  register,
  resetPassword,
  newPassword,
  changePassword,
  logout,
});
