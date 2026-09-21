import { normalizeInviteCode } from '@/utils/normalize/normalizeInviteCode';

import type {
  LoginApiRequest,
  NewPasswordApiRequest,
  RegisterApiRequest,
  ResetPasswordApiRequest,
} from '../apis/AuthApi.type';
import type {
  LoginRequest,
  NewPasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../service/AuthService.type';

const mapLoginRequest = (params: LoginRequest): LoginApiRequest => ({
  account: params.account,
  password: params.password,
});

const mapRegisterRequest = (params: RegisterRequest): RegisterApiRequest => {
  const inviteCode = normalizeInviteCode(params.inviteCode);
  return {
    username: params.username,
    password: params.password,
    ...(inviteCode ? { inviteCode } : {}),
  };
};

const mapResetPasswordRequest = (params: ResetPasswordRequest): ResetPasswordApiRequest => ({
  userName: params.userName,
});

const mapNewPasswordRequest = (params: NewPasswordRequest): NewPasswordApiRequest => ({
  newPassword: params.newPassword,
  token: params.token,
});

export const AuthServicesMap = {
  mapLoginRequest,
  mapRegisterRequest,
  mapResetPasswordRequest,
  mapNewPasswordRequest,
};
