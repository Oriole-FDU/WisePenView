import type { UIMessage } from 'ai';
import { z } from 'zod';

import { IsoDateTimeSchema, NonEmptyStringSchema } from '@/apis/schema';

export const MessageAttachmentSnapshotSchema = z.object({
  attachmentId: NonEmptyStringSchema,
  filename: z.string(),
  kind: z.enum(['temporary', 'resource']),
  available: z.boolean(),
});

export const ChatMessageMetadataSchema = z.object({
  createdAt: IsoDateTimeSchema.optional(),
  selectedAttachments: z.array(MessageAttachmentSnapshotSchema).optional(),
  modelId: z.string().optional(),
  providerId: z.string().optional(),
  provider: z.string().optional(),
  modelName: z.string().optional(),
  reasoningDurationSeconds: z.number().finite().nonnegative().optional(),
});

export const ToolApprovalRequestDataSchema = z.strictObject({
  approvalId: NonEmptyStringSchema,
  toolCallId: NonEmptyStringSchema,
  toolName: NonEmptyStringSchema,
  input: z.unknown(),
});

export type MessageAttachmentSnapshot = z.infer<typeof MessageAttachmentSnapshotSchema>;
export type ChatMessageMetadata = z.infer<typeof ChatMessageMetadataSchema>;
export type ToolApprovalRequestData = z.infer<typeof ToolApprovalRequestDataSchema>;

export type ChatMessageDataParts = {
  'tool-approval-request': ToolApprovalRequestData;
};

export type WisePenUIMessage = UIMessage<ChatMessageMetadata, ChatMessageDataParts>;
