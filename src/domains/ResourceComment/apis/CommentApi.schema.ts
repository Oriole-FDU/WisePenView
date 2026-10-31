import { z } from 'zod';

import {
  createPageResponseSchema,
  EpochMillisSchema,
  NonBlankStringSchema,
  OpaqueIdSchema,
  PageApiRequestSchema,
} from '@/apis/schema';
import { UserDisplayApiSchema } from '@/domains/User/apis/UserInformationApi.schema';

export const CommentSortByApiSchema = z.enum(['CREATE_TIME', 'LIKE_COUNT']);

export const CommentTypeApiSchema = z.enum(['COMMENT', 'REPLY_TO_COMMENT', 'REPLY_TO_REPLY']);

export const CreateCommentApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  content: NonBlankStringSchema,
  imageUrls: z.array(z.string()),
});

export const CreateReplyApiRequestSchema = CreateCommentApiRequestSchema.extend({
  replyTo: OpaqueIdSchema,
});

export const CommentItemActionApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  commentId: OpaqueIdSchema,
});

export const ListCommentsApiRequestSchema = PageApiRequestSchema.extend({
  resourceId: OpaqueIdSchema,
  sortBy: CommentSortByApiSchema,
  size: z.number().int().min(1).max(50),
});

export const ListRepliesApiRequestSchema = PageApiRequestSchema.extend({
  rootCommentId: OpaqueIdSchema,
  size: z.number().int().min(1).max(50),
});

export const ResourceCommentItemApiSchema = z.object({
  resourceId: OpaqueIdSchema,
  replyToUserId: OpaqueIdSchema.nullable(),
  authorId: OpaqueIdSchema,
  content: z.string(),
  imageUrls: z.array(z.string()),
  likeCount: z.number().int().nonnegative(),
  replyCount: z.number().int().nonnegative(),
  commentType: CommentTypeApiSchema,
  commentId: OpaqueIdSchema,
  authorInfo: UserDisplayApiSchema.nullable(),
  replyToUserInfo: UserDisplayApiSchema.nullable(),
  createTime: EpochMillisSchema,
  deleted: z.boolean(),
});

export const CommentPageApiResponseSchema = createPageResponseSchema(ResourceCommentItemApiSchema);

export type CommentSortByApiValue = z.infer<typeof CommentSortByApiSchema>;
export type CreateCommentApiRequest = z.infer<typeof CreateCommentApiRequestSchema>;
export type CreateReplyApiRequest = z.infer<typeof CreateReplyApiRequestSchema>;
export type CommentItemActionApiRequest = z.infer<typeof CommentItemActionApiRequestSchema>;
export type ListCommentsApiRequest = z.infer<typeof ListCommentsApiRequestSchema>;
export type ListRepliesApiRequest = z.infer<typeof ListRepliesApiRequestSchema>;
export type ResourceCommentItemApiResponse = z.infer<typeof ResourceCommentItemApiSchema>;
export type CommentPageApiResponse = z.infer<typeof CommentPageApiResponseSchema>;
