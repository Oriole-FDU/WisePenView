import { z } from 'zod';

import type { ApiContract } from '@/apis/contract';

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

export type LoginApiRequest = z.infer<typeof LoginApiRequestSchema>;
export type RegisterApiRequest = z.infer<typeof RegisterApiRequestSchema>;
export type ResetPasswordApiRequest = z.infer<typeof ResetPasswordApiRequestSchema>;
export type NewPasswordApiRequest = z.infer<typeof NewPasswordApiRequestSchema>;
export type ChangePasswordApiRequest = z.infer<typeof ChangePasswordApiRequestSchema>;
export type LoginApiResponse = z.infer<typeof LoginApiResponseSchema>;
export type EmptyAuthApiResponse = z.infer<typeof EmptyAuthApiResponseSchema>;
export type EmptyAuthApiRequest = z.infer<typeof EmptyAuthApiRequestSchema>;

export const LoginApiContract = {
  name: 'LoginApi',
  endpoint: '/auth/login',
  request: LoginApiRequestSchema,
  response: LoginApiResponseSchema,
} as const satisfies ApiContract<LoginApiRequest, LoginApiResponse>;

export const LogoutApiContract = {
  name: 'LogoutApi',
  endpoint: '/auth/logout',
  request: EmptyAuthApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
} as const satisfies ApiContract<EmptyAuthApiRequest, EmptyAuthApiResponse>;

export const RegisterApiContract = {
  name: 'RegisterApi',
  endpoint: '/auth/register',
  request: RegisterApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
} as const satisfies ApiContract<RegisterApiRequest, EmptyAuthApiResponse>;

export const ResetPasswordEmailApiContract = {
  name: 'ResetPasswordEmailApi',
  endpoint: '/auth/sendResetMail',
  request: ResetPasswordApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
} as const satisfies ApiContract<ResetPasswordApiRequest, EmptyAuthApiResponse>;

export const ResetPasswordApiContract = {
  name: 'ResetPasswordApi',
  endpoint: '/auth/resetPassword',
  request: NewPasswordApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
} as const satisfies ApiContract<NewPasswordApiRequest, EmptyAuthApiResponse>;

export const ChangePasswordApiContract = {
  name: 'ChangePasswordApi',
  endpoint: '/auth/changePassword',
  request: ChangePasswordApiRequestSchema,
  response: EmptyAuthApiResponseSchema,
} as const satisfies ApiContract<ChangePasswordApiRequest, EmptyAuthApiResponse>;
