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

/** 登录成功时必须返回可作为认证凭据的非空 sessionId。 */
export const LoginApiResponseSchema = requiredText;

/** Java R.ok() 的 wire payload 为 null，而不是缺失值或空字符串。 */
export const EmptyAuthApiResponseSchema = z.null();

export type LoginApiRequest = z.infer<typeof LoginApiRequestSchema>;
export type RegisterApiRequest = z.infer<typeof RegisterApiRequestSchema>;
export type ResetPasswordApiRequest = z.infer<typeof ResetPasswordApiRequestSchema>;
export type NewPasswordApiRequest = z.infer<typeof NewPasswordApiRequestSchema>;
export type ChangePasswordApiRequest = z.infer<typeof ChangePasswordApiRequestSchema>;
export type LoginApiResponse = z.infer<typeof LoginApiResponseSchema>;
export type EmptyAuthApiResponse = z.infer<typeof EmptyAuthApiResponseSchema>;
