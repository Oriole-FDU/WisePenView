import { z } from 'zod';

import {
  createPageResponseSchema,
  EpochMillisSchema,
  JavaLongIdSchema,
  NullableStringSchema,
  PageApiRequestSchema,
} from '@/apis/schema';
import {
  UserDegreeLevelApiSchema,
  UserIdentityTypeApiSchema,
  UserSexApiSchema,
  UserStatusApiSchema,
  UserVerificationModeApiSchema,
} from '@/domains/User/apis/UserInformationApi.schema';
import { IDENTITY } from '@/domains/User/enum';

export const AdminIdentityTypeQueryApiSchema = z.enum(IDENTITY.options.map((option) => option.key));

export const AdminUserApiSchema = z.object({
  userId: JavaLongIdSchema,
  username: NullableStringSchema,
  nickname: NullableStringSchema,
  realName: NullableStringSchema,
  avatar: NullableStringSchema,
  identityType: UserIdentityTypeApiSchema.nullable(),
  campusNo: NullableStringSchema,
  email: NullableStringSchema,
  mobile: NullableStringSchema,
  verificationMode: UserVerificationModeApiSchema.nullable(),
  verificationProviderCode: NullableStringSchema,
  userStatus: UserStatusApiSchema,
  createTime: EpochMillisSchema,
  updateTime: EpochMillisSchema,
});

export const FetchAdminUserListApiRequestSchema = PageApiRequestSchema.extend({
  keyword: z.string(),
  userStatus: UserStatusApiSchema.optional(),
  identityType: AdminIdentityTypeQueryApiSchema.optional(),
});

export const FetchAdminUserListApiResponseSchema = createPageResponseSchema(AdminUserApiSchema);

export const GetAdminUserInfoApiRequestSchema = z.strictObject({
  userId: JavaLongIdSchema,
});

export const GetAdminUserInfoApiResponseSchema = z.object({
  userId: JavaLongIdSchema,
  sex: UserSexApiSchema.nullable(),
  inviteCode: NullableStringSchema,
  university: NullableStringSchema,
  college: NullableStringSchema,
  major: NullableStringSchema,
  className: NullableStringSchema,
  enrollmentYear: z.number().int().nullable(),
  degreeLevel: UserDegreeLevelApiSchema.nullable(),
  academicTitle: NullableStringSchema,
  createTime: EpochMillisSchema,
  updateTime: EpochMillisSchema,
});

export const ChangeAdminUserInfoApiRequestSchema = z.strictObject({
  userId: JavaLongIdSchema,
  nickname: NullableStringSchema.optional(),
  username: NullableStringSchema.optional(),
  avatar: NullableStringSchema.optional(),
  identityType: UserIdentityTypeApiSchema.nullable().optional(),
  realName: NullableStringSchema.optional(),
  campusNo: NullableStringSchema.optional(),
  email: NullableStringSchema.optional(),
  mobile: NullableStringSchema.optional(),
  verificationMode: UserVerificationModeApiSchema.nullable().optional(),
  verificationProviderCode: NullableStringSchema.optional(),
  userStatus: UserStatusApiSchema.optional(),
});

export const ChangeAdminUserProfileApiRequestSchema = z.strictObject({
  userId: JavaLongIdSchema,
  sex: UserSexApiSchema.nullable().optional(),
  inviteCode: NullableStringSchema.optional(),
  university: NullableStringSchema.optional(),
  college: NullableStringSchema.optional(),
  major: NullableStringSchema.optional(),
  className: NullableStringSchema.optional(),
  enrollmentYear: z.number().int().nullable().optional(),
  degreeLevel: UserDegreeLevelApiSchema.nullable().optional(),
  academicTitle: NullableStringSchema.optional(),
});

export const ResetAdminUserPasswordApiRequestSchema = z.strictObject({
  userId: JavaLongIdSchema,
  newPassword: z
    .string()
    .regex(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/, '密码必须超过 8 位并同时包含字母和数字')
    .optional(),
});

export type AdminUserApiModel = z.infer<typeof AdminUserApiSchema>;
export type FetchAdminUserListApiRequest = z.infer<typeof FetchAdminUserListApiRequestSchema>;
export type FetchAdminUserListApiResponse = z.infer<typeof FetchAdminUserListApiResponseSchema>;
export type GetAdminUserInfoApiRequest = z.infer<typeof GetAdminUserInfoApiRequestSchema>;
export type GetAdminUserInfoApiResponse = z.infer<typeof GetAdminUserInfoApiResponseSchema>;
export type ChangeAdminUserInfoApiRequest = z.infer<typeof ChangeAdminUserInfoApiRequestSchema>;
export type ChangeAdminUserProfileApiRequest = z.infer<
  typeof ChangeAdminUserProfileApiRequestSchema
>;
export type ResetAdminUserPasswordApiRequest = z.infer<
  typeof ResetAdminUserPasswordApiRequestSchema
>;
