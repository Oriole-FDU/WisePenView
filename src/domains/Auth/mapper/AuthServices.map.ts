import { normalizeInviteCode } from '@/domains/Auth/utils/normalizeInviteCode';

import type {
  ChangePasswordApiRequest,
  LoginApiRequest,
  RegisterApiRequest,
  ResetPasswordApiRequest,
  ResetPasswordEmailApiRequest,
} from '../apis/AuthApi.contract';
import type {
  ChangePasswordRequest,
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

const mapResetPasswordRequest = (params: ResetPasswordRequest): ResetPasswordEmailApiRequest => ({
  username: params.username,
});

const mapNewPasswordRequest = (params: NewPasswordRequest): ResetPasswordApiRequest => ({
  newPassword: params.newPassword,
  token: params.token,
});

const mapChangePasswordRequest = (params: ChangePasswordRequest): ChangePasswordApiRequest => ({
  oldPassword: params.oldPassword,
  newPassword: params.newPassword,
});

export const AuthServicesMap = {
  mapLoginRequest,
  mapRegisterRequest,
  mapResetPasswordRequest,
  mapNewPasswordRequest,
  mapChangePasswordRequest,
};
