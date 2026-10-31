import { z } from 'zod';

import { EpochMillisSchema, NonBlankStringSchema, OpaqueIdSchema } from '@/apis/schema';
import { UserDisplayApiSchema } from '@/domains/User/apis/UserInformationApi.schema';

const ContentVersionApiSchema = z.number().int().positive().optional();

export const ListInlineCommentsApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  contentVersion: ContentVersionApiSchema,
  resolved: z.boolean().optional(),
});

export const CreateInlineCommentApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  externalAnchorId: NonBlankStringSchema,
  quoteText: z.string().optional(),
  anchorPayload: z.record(z.string(), z.unknown()).optional(),
  contentVersion: ContentVersionApiSchema,
  applicableFromVersion: z.number().int().positive().optional(),
  applicableToVersion: z.number().int().positive().optional(),
  content: NonBlankStringSchema,
  imageUrls: z.array(z.string()),
  mentionUserIds: z.array(OpaqueIdSchema),
});

export const AddInlineCommentItemApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  inlineCommentId: OpaqueIdSchema,
  contentVersion: ContentVersionApiSchema,
  content: NonBlankStringSchema,
  imageUrls: z.array(z.string()),
  mentionUserIds: z.array(OpaqueIdSchema),
});

export const UpdateInlineCommentItemApiRequestSchema = AddInlineCommentItemApiRequestSchema.extend({
  itemId: OpaqueIdSchema,
});

export const SetInlineCommentItemReactionApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  inlineCommentId: OpaqueIdSchema,
  itemId: OpaqueIdSchema,
  contentVersion: ContentVersionApiSchema,
  emojiId: NonBlankStringSchema,
});

export const DeleteInlineCommentItemReactionApiRequestSchema =
  SetInlineCommentItemReactionApiRequestSchema;

export const DeleteInlineCommentItemApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  inlineCommentId: OpaqueIdSchema,
  itemId: OpaqueIdSchema,
});

export const ChangeInlineCommentResolveStatusApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  inlineCommentId: OpaqueIdSchema,
  resolved: z.boolean(),
  contentVersion: ContentVersionApiSchema,
});

export const InlineCommentAnchorRefApiSchema = z.object({
  externalAnchorId: NonBlankStringSchema,
  quoteText: z.string().nullable(),
  anchorPayload: z.record(z.string(), z.unknown()),
});

export const InlineCommentReactionApiSchema = z.object({
  emojiId: NonBlankStringSchema,
  createTime: EpochMillisSchema,
});

export const InlineCommentReactionGroupApiSchema = z.object({
  emojiId: NonBlankStringSchema,
  count: z.number().int().nonnegative(),
  reactedByCurrentUser: z.boolean(),
  users: z.array(UserDisplayApiSchema.nullable()),
});

export const InlineCommentItemApiSchema = z.object({
  itemId: OpaqueIdSchema,
  authorId: OpaqueIdSchema,
  authorInfo: UserDisplayApiSchema.nullable(),
  content: z.string(),
  imageUrls: z.array(z.string()),
  mentionUserIds: z.array(OpaqueIdSchema),
  reactions: z.record(z.string(), z.array(InlineCommentReactionApiSchema)),
  reactionGroups: z.array(InlineCommentReactionGroupApiSchema),
  createTime: EpochMillisSchema,
  updateTime: EpochMillisSchema,
});

export const InlineCommentApiSchema = z.object({
  inlineCommentId: OpaqueIdSchema,
  resourceId: OpaqueIdSchema,
  applicableFromVersion: z.number().int().positive().nullable(),
  applicableToVersion: z.number().int().positive().nullable(),
  creatorId: OpaqueIdSchema,
  creatorInfo: UserDisplayApiSchema.nullable(),
  anchorRef: InlineCommentAnchorRefApiSchema.nullable(),
  items: z.array(InlineCommentItemApiSchema),
  resolved: z.boolean(),
  resolvedBy: OpaqueIdSchema.nullable(),
  resolvedByInfo: UserDisplayApiSchema.nullable(),
  resolvedAt: EpochMillisSchema.nullable(),
  createTime: EpochMillisSchema,
  updateTime: EpochMillisSchema,
});

export const ListInlineCommentsApiResponseSchema = z.array(InlineCommentApiSchema);

export type ListInlineCommentsApiRequest = z.infer<typeof ListInlineCommentsApiRequestSchema>;
export type CreateInlineCommentApiRequest = z.infer<typeof CreateInlineCommentApiRequestSchema>;
export type AddInlineCommentItemApiRequest = z.infer<typeof AddInlineCommentItemApiRequestSchema>;
export type UpdateInlineCommentItemApiRequest = z.infer<
  typeof UpdateInlineCommentItemApiRequestSchema
>;
export type SetInlineCommentItemReactionApiRequest = z.infer<
  typeof SetInlineCommentItemReactionApiRequestSchema
>;
export type DeleteInlineCommentItemReactionApiRequest = z.infer<
  typeof DeleteInlineCommentItemReactionApiRequestSchema
>;
export type DeleteInlineCommentItemApiRequest = z.infer<
  typeof DeleteInlineCommentItemApiRequestSchema
>;
export type ChangeInlineCommentResolveStatusApiRequest = z.infer<
  typeof ChangeInlineCommentResolveStatusApiRequestSchema
>;
export type InlineCommentApiResponse = z.infer<typeof InlineCommentApiSchema>;
export type InlineCommentItemApiResponse = z.infer<typeof InlineCommentItemApiSchema>;
export type InlineCommentReactionApiResponse = z.infer<typeof InlineCommentReactionApiSchema>;
export type InlineCommentReactionGroupApiResponse = z.infer<
  typeof InlineCommentReactionGroupApiSchema
>;
export type InlineCommentUserDisplayApiResponse = z.infer<typeof UserDisplayApiSchema>;
export type ListInlineCommentsApiResponse = z.infer<typeof ListInlineCommentsApiResponseSchema>;
