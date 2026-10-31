import { z } from 'zod';

import {
  createPageResponseSchema,
  EpochMillisSchema,
  JavaLongIdSchema,
  NullableStringSchema,
  PageApiRequestSchema,
} from '@/apis/schema';

export const MessageDeliveryScopeApiSchema = z.enum(['DIRECT', 'ALL_USERS']);

export const MessageTypeApiSchema = z.enum(['SYSTEM', 'NORMAL', 'RESOURCE_INTERACTION']);

export const ListUserMessagesApiRequestSchema = PageApiRequestSchema;

export const UserMessageApiSchema = z.object({
  messageId: JavaLongIdSchema,
  deliveryScope: MessageDeliveryScopeApiSchema,
  messageType: MessageTypeApiSchema,
  title: NullableStringSchema,
  content: NullableStringSchema,
  jumpUrl: NullableStringSchema,
  extra: NullableStringSchema,
  readTime: EpochMillisSchema.nullable(),
  createTime: EpochMillisSchema,
});

export const ListUserMessagesApiResponseSchema = createPageResponseSchema(UserMessageApiSchema);

export const ReadMessageApiRequestSchema = z.strictObject({
  messageIds: z.array(JavaLongIdSchema).min(1),
});

export type ListUserMessagesApiRequest = z.infer<typeof ListUserMessagesApiRequestSchema>;
export type UserMessageApiModel = z.infer<typeof UserMessageApiSchema>;
export type ListUserMessagesApiResponse = z.infer<typeof ListUserMessagesApiResponseSchema>;
export type ReadMessageApiRequest = z.infer<typeof ReadMessageApiRequestSchema>;
