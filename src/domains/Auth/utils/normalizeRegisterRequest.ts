import type { RegisterRequest } from '../service/AuthService.type';

/** 邀请码归一化：去除首尾空白并统一为大写，保证链接参数、输入框与请求体一致 */
export function normalizeInviteCode(value: string | null | undefined): string {
  return value ? value.trim().toUpperCase() : '';
}

/** 将注册输入归一化为可直接提交的注册请求；空邀请码不进入请求体 */
export function normalizeRegisterRequest(params: RegisterRequest): RegisterRequest {
  const inviteCode = normalizeInviteCode(params.inviteCode);
  return {
    username: params.username,
    password: params.password,
    ...(inviteCode ? { inviteCode } : {}),
  };
}
