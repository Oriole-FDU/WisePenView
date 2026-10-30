import { z } from 'zod';

import {
  createPageResponseSchema,
  EpochMillisSchema,
  JavaLongIdSchema,
  NonBlankStringSchema,
  NullableStringSchema,
  PageApiRequestSchema,
} from '@/apis/schema';

import {
  UserDegreeLevelApiSchema,
  UserDisplayApiSchema,
  UserSexApiSchema,
} from './UserInformationApi.schema';

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

export const InitiateEmailVerifyApiRequestSchema = z.strictObject({
  email: z.email(),
});

export const CheckEmailVerifyApiRequestSchema = z.strictObject({
  token: NonBlankStringSchema,
});

export const InitiateFudanUISVerifyApiRequestSchema = z.strictObject({
  uisAccount: NonBlankStringSchema,
  uisPassword: NonBlankStringSchema,
});

export const CheckFudanUISVerifyApiResponseSchema = z.object({
  completed: z.boolean(),
  requireAction: z.boolean(),
  actionPayload: NullableStringSchema,
  message: NullableStringSchema,
});

export const UserFeedbackTypeApiSchema = z.enum([
  'BUG_REPORT',
  'SUGGESTION',
  'CONSULTATION',
  'COMPLAINT',
  'OTHER',
]);

export const AddFeedbackApiRequestSchema = z.strictObject({
  content: z.string(),
  contact: z.string(),
  imageUrl: z.string().max(1024).optional(),
  browser: z.string().optional(),
  type: UserFeedbackTypeApiSchema,
});

export const ListUserInviteRecordsApiRequestSchema = PageApiRequestSchema;

export const UserInviteStatusApiSchema = z.enum(['BOUND', 'REWARDED']);

export const UserInviteRecordApiSchema = z.object({
  id: JavaLongIdSchema,
  inviteeUserId: JavaLongIdSchema,
  inviteeDisplay: UserDisplayApiSchema.nullable(),
  status: UserInviteStatusApiSchema,
  createTime: EpochMillisSchema,
  rewardTime: EpochMillisSchema.nullable(),
});

export const ListUserInviteRecordsApiResponseSchema =
  createPageResponseSchema(UserInviteRecordApiSchema);

export type ChangeUserInfoApiRequest = z.infer<typeof ChangeUserInfoApiRequestSchema>;
export type ChangeUserProfileApiRequest = z.infer<typeof ChangeUserProfileApiRequestSchema>;
export type InitiateEmailVerifyApiRequest = z.infer<typeof InitiateEmailVerifyApiRequestSchema>;
export type CheckEmailVerifyApiRequest = z.infer<typeof CheckEmailVerifyApiRequestSchema>;
export type InitiateFudanUISVerifyApiRequest = z.infer<
  typeof InitiateFudanUISVerifyApiRequestSchema
>;
export type CheckFudanUISVerifyApiResponse = z.infer<typeof CheckFudanUISVerifyApiResponseSchema>;
export type UserFeedbackTypeApiValue = z.infer<typeof UserFeedbackTypeApiSchema>;
export type AddFeedbackApiRequest = z.infer<typeof AddFeedbackApiRequestSchema>;
export type ListUserInviteRecordsApiRequest = z.infer<typeof ListUserInviteRecordsApiRequestSchema>;
export type UserInviteStatusApiValue = z.infer<typeof UserInviteStatusApiSchema>;
export type UserInviteRecordApiResponse = z.infer<typeof UserInviteRecordApiSchema>;
export type ListUserInviteRecordsApiResponse = z.infer<
  typeof ListUserInviteRecordsApiResponseSchema
>;
