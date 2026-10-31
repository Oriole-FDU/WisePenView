import { z } from 'zod';

import { NullableStringSchema } from '@/apis/schema';

import { UserDegreeLevelApiSchema, UserSexApiSchema } from './UserInformationApi.schema';

export const ChangeUserInfoApiRequestSchema = z.strictObject({
  nickname: z.string().optional(),
  avatar: z.string().optional(),
  realName: z.string().optional(),
});

export const ChangeUserProfileApiRequestSchema = z.strictObject({
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

export type ChangeUserInfoApiRequest = z.infer<typeof ChangeUserInfoApiRequestSchema>;
export type ChangeUserProfileApiRequest = z.infer<typeof ChangeUserProfileApiRequestSchema>;
