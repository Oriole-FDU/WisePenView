import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';
import { AuthApi } from '@domain-apis';
import { AuthServicesMap } from '../mapper/AuthServices.map';
import type {
  LoginRequest,
  NewPasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from './AuthService.type';
import type { IAuthService } from './index.type';

const login = async (params: LoginRequest) => {
  const apiParams = AuthServicesMap.mapLoginRequest(params);
  await AuthApi.login(apiParams);
  authSessionCoordinator.publish('login');
};

const logout = async () => {
  await AuthApi.logout();
  authSessionCoordinator.publish('logout');
};

const register = async (params: RegisterRequest) => {
  const apiParams = AuthServicesMap.mapRegisterRequest(params);
  await AuthApi.register(apiParams);
};

const resetPassword = async (params: ResetPasswordRequest) => {
  const apiParams = AuthServicesMap.mapResetPasswordRequest(params);
  await AuthApi.forgotPasswordEmail(apiParams);
};

const newPassword = async (params: NewPasswordRequest) => {
  const apiParams = AuthServicesMap.mapNewPasswordRequest(params);
  await AuthApi.forgotPasswordReset(apiParams);
};

export const createAuthServices = (): IAuthService => ({
  login,
  register,
  resetPassword,
  newPassword,
  logout,
});
