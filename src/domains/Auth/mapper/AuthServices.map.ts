import { normalizeInviteCode } from '@/domains/Auth/utils/normalizeInviteCode';

import type {
  ChangePasswordApiRequest,
  LoginApiRequest,
  NewPasswordApiRequest,
  RegisterApiRequest,
  ResetPasswordApiRequest,
} from '../apis/AuthApi.schema';
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

const mapResetPasswordRequest = (params: ResetPasswordRequest): ResetPasswordApiRequest => ({
  username: params.username,
});

const mapNewPasswordRequest = (params: NewPasswordRequest): NewPasswordApiRequest => ({
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
