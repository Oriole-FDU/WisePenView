import { z } from 'zod';

const requiredText = z.string().min(1);

export const LoginApiRequestSchema = z.object({
  account: requiredText,
  password: requiredText,
});

export const RegisterApiRequestSchema = z.object({
  username: requiredText,
  password: requiredText,
  inviteCode: requiredText.optional(),
});

export const ResetPasswordApiRequestSchema = z.object({
  username: requiredText,
});

export const NewPasswordApiRequestSchema = z.object({
  token: requiredText,
  newPassword: requiredText,
});

export const ChangePasswordApiRequestSchema = z.object({
  oldPassword: requiredText,
  newPassword: requiredText,
});

/** 无请求体的 POST 在 wire JSON 中没有 payload。 */
export const EmptyAuthApiRequestSchema = z.undefined();

/** 登录成功时必须返回可作为认证凭据的非空 sessionId。 */
export const LoginApiResponseSchema = requiredText;

/** Java R.ok() 的 wire payload 为 null，而不是缺失值或空字符串。 */
export const EmptyAuthApiResponseSchema = z.null();
