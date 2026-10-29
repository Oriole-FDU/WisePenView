import { z } from 'zod';

import { NonEmptyStringSchema } from '@/apis/schema';

export const LoginApiRequestSchema = z.strictObject({
  account: NonEmptyStringSchema,
  password: NonEmptyStringSchema,
});

export const RegisterApiRequestSchema = z.strictObject({
  username: NonEmptyStringSchema,
  password: NonEmptyStringSchema,
  inviteCode: NonEmptyStringSchema.optional(),
});

export const ResetPasswordApiRequestSchema = z.strictObject({
  username: NonEmptyStringSchema,
});

export const NewPasswordApiRequestSchema = z.strictObject({
  token: NonEmptyStringSchema,
  newPassword: NonEmptyStringSchema,
});

export const ChangePasswordApiRequestSchema = z.strictObject({
  oldPassword: NonEmptyStringSchema,
  newPassword: NonEmptyStringSchema,
});

/** 登录成功时必须返回可作为认证凭据的非空 sessionId。 */
export const LoginApiResponseSchema = NonEmptyStringSchema;
