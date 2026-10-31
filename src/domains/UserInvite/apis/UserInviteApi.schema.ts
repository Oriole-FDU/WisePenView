import { z } from 'zod';

import {
  createPageResponseSchema,
  EpochMillisSchema,
  JavaLongIdSchema,
  PageApiRequestSchema,
} from '@/apis/schema';
import { UserDisplayApiSchema } from '@/domains/User/apis/UserInformationApi.schema';

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

export type ListUserInviteRecordsApiRequest = z.infer<typeof ListUserInviteRecordsApiRequestSchema>;
export type UserInviteStatusApiValue = z.infer<typeof UserInviteStatusApiSchema>;
export type UserInviteRecordApiResponse = z.infer<typeof UserInviteRecordApiSchema>;
export type ListUserInviteRecordsApiResponse = z.infer<
  typeof ListUserInviteRecordsApiResponseSchema
>;
