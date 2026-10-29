import { z } from 'zod';

import { JavaLongIdSchema, NonEmptyStringSchema, NullableStringSchema } from '@/apis/schema';

/** 后端 IdentityType 通过 @JsonValue 输出数字 code。 */
export const UserIdentityTypeApiSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** 后端 UserStatus 通过 @JsonValue 输出字符串 value。 */
export const UserStatusApiSchema = z.enum(['NORMAL', 'UNIDENTIFIED', 'BANNED']);

export const UserSexApiSchema = z.enum(['MALE', 'FEMALE', 'UNKNOWN']);

export const UserDegreeLevelApiSchema = z.enum(['UNKNOWN', 'UNDERGRADUATE', 'MASTER', 'DOCTOR']);

export const UserVerificationModeApiSchema = z.enum(['EDU_EMAIL', 'CAMPUS_IDENTITY_PROVIDER']);

/** 只读字段来自后端认证策略，新增字段时必须同步更新前后端契约。 */
export const UserReadonlyFieldApiSchema = z.enum([
  'username',
  'realName',
  'campusNo',
  'email',
  'mobile',
  'userStatus',
  'sex',
  'university',
  'college',
  'major',
  'className',
  'enrollmentYear',
  'degreeLevel',
  'inviteCode',
]);

/** 跨资源复用的轻量用户展示信息；后端各字段均可能为 null。 */
export const UserDisplayApiSchema = z.object({
  nickname: NullableStringSchema,
  username: NullableStringSchema,
  avatar: NullableStringSchema,
  identityType: UserIdentityTypeApiSchema.nullable(),
  realName: NullableStringSchema,
  campusNo: NullableStringSchema,
  email: NullableStringSchema,
  mobile: NullableStringSchema,
});

/** 资源作者、创建者等轻量展示使用；这里只暴露稳定的用户展示信息。 */
export const UserSummaryApiSchema = z.object({
  userId: JavaLongIdSchema,
  username: NonEmptyStringSchema,
  nickname: NullableStringSchema,
  avatar: NullableStringSchema,
  identityType: UserIdentityTypeApiSchema.nullable(),
  realName: NullableStringSchema,
});

export const UserInfoApiSchema = z.object({
  nickname: NullableStringSchema,
  username: NonEmptyStringSchema,
  avatar: NullableStringSchema,
  identityType: UserIdentityTypeApiSchema,
  realName: NullableStringSchema,
  campusNo: NullableStringSchema,
  email: NullableStringSchema,
  mobile: NullableStringSchema,
  verificationMode: UserVerificationModeApiSchema.nullable(),
  verificationProviderCode: NullableStringSchema,
  userStatus: UserStatusApiSchema,
});

export const UserProfileApiSchema = z.object({
  sex: UserSexApiSchema.nullable(),
  inviteCode: NullableStringSchema,
  university: NullableStringSchema,
  college: NullableStringSchema,
  major: NullableStringSchema,
  className: NullableStringSchema,
  enrollmentYear: z.number().int().nullable(),
  degreeLevel: UserDegreeLevelApiSchema.nullable(),
  academicTitle: NullableStringSchema,
});

export const GetUserInfoApiResponseSchema = z.object({
  userId: JavaLongIdSchema,
  userInfo: UserInfoApiSchema,
  userProfile: UserProfileApiSchema,
  readonlyFields: z.array(UserReadonlyFieldApiSchema).nullable(),
});

export const SearchUsersApiRequestSchema = z.strictObject({
  keyword: z.string().trim().min(1).max(128),
});

export const ListUserSearchSuggestionsApiRequestSchema = z.strictObject({
  keyword: z.string().trim().min(2).max(128),
  size: z.number().int().min(1).max(20).optional(),
});

export const UserSearchApiResponseSchema = z.array(UserSummaryApiSchema);

export type UserIdentityTypeApiValue = z.infer<typeof UserIdentityTypeApiSchema>;
export type UserStatusApiValue = z.infer<typeof UserStatusApiSchema>;
export type UserSexApiValue = z.infer<typeof UserSexApiSchema>;
export type UserDegreeLevelApiValue = z.infer<typeof UserDegreeLevelApiSchema>;
export type UserVerificationModeApiValue = z.infer<typeof UserVerificationModeApiSchema>;
export type UserReadonlyFieldApiValue = z.infer<typeof UserReadonlyFieldApiSchema>;
export type UserDisplayApi = z.infer<typeof UserDisplayApiSchema>;
export type UserSummaryApi = z.infer<typeof UserSummaryApiSchema>;
export type GetUserInfoApiResponse = z.infer<typeof GetUserInfoApiResponseSchema>;
export type SearchUsersApiRequest = z.infer<typeof SearchUsersApiRequestSchema>;
export type ListUserSearchSuggestionsApiRequest = z.infer<
  typeof ListUserSearchSuggestionsApiRequestSchema
>;
