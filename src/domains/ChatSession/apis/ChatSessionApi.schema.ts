import { z } from 'zod';

import {
  IsoDateTimeSchema,
  NonEmptyStringSchema,
  NullableStringSchema,
  OpaqueIdSchema,
} from '@/apis/schema';

export const ChatSessionApiSchema = z.object({
  id: OpaqueIdSchema,
  user_id: OpaqueIdSchema,
  title: NonEmptyStringSchema,
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
  agent_id: OpaqueIdSchema.nullable(),
  agent_version: z.number().int().positive().nullable(),
});

export const CreateSessionApiRequestSchema = z.strictObject({
  title: NullableStringSchema.optional(),
  agent_id: OpaqueIdSchema.nullable().optional(),
});

export const SetSessionAgentApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
  agent_id: OpaqueIdSchema.nullable().optional(),
});

export const RenameSessionApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
  new_title: NullableStringSchema.optional(),
});

export const DeleteSessionApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
});

const OptionalPageSchema = z.strictObject({
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(100).optional(),
});

export const ListSessionsApiRequestSchema = OptionalPageSchema;

export const ListHistoryMessagesApiRequestSchema = OptionalPageSchema.extend({
  session_id: OpaqueIdSchema,
});

const NullPartFields = {
  text: z.null(),
  state: z.null(),
  toolCallId: z.null(),
  input: z.null(),
  output: z.null(),
};

export const UIMessagePartApiSchema = z.union([
  z.object({
    type: z.literal('text'),
    text: z.string(),
    state: z.enum(['streaming', 'done']),
    toolCallId: z.null(),
    input: z.null(),
    output: z.null(),
  }),
  z.object({
    type: z.literal('reasoning'),
    text: z.string(),
    state: z.enum(['streaming', 'done']),
    toolCallId: z.null(),
    input: z.null(),
    output: z.null(),
  }),
  z.object({ type: z.literal('step-start'), ...NullPartFields }),
  z.object({
    type: z.string().regex(/^tool-.+$/),
    text: z.null(),
    state: z.enum([
      'input-streaming',
      'input-available',
      'approval-requested',
      'approval-responded',
      'output-available',
      'output-error',
      'output-denied',
    ]),
    toolCallId: NonEmptyStringSchema,
    input: z.unknown(),
    output: z.unknown().nullable(),
  }),
]);

export const UIMessageApiSchema = z.object({
  id: OpaqueIdSchema,
  role: z.enum(['system', 'user', 'assistant']),
  parts: z.array(UIMessagePartApiSchema),
  createdAt: IsoDateTimeSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export const PythonPageResponseSchema = <ItemSchema extends z.ZodType>(itemSchema: ItemSchema) =>
  z.object({
    list: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    size: z.number().int().min(1),
    total_page: z.number().int().nonnegative(),
  });

export const ListSessionsApiResponseSchema = PythonPageResponseSchema(ChatSessionApiSchema);
export const ListHistoryMessagesApiResponseSchema = PythonPageResponseSchema(UIMessageApiSchema);

export const InitTemporaryAttachmentUploadApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
  filename: NonEmptyStringSchema.max(255),
  extension: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-zA-Z0-9]+$/),
  file_size: z.number().int().positive().max(104_857_600),
  md5: z.string().regex(/^[a-fA-F0-9]{32}$/),
  enable_library: z.boolean().optional(),
});

export const InitTemporaryAttachmentUploadApiResponseSchema = z.object({
  attachment_id: OpaqueIdSchema,
  object_key: NonEmptyStringSchema,
  put_url: z.string(),
  callback_header: z.string(),
  flash_uploaded: z.boolean(),
});

export type ChatSessionApi = z.infer<typeof ChatSessionApiSchema>;
export type CreateSessionApiRequest = z.infer<typeof CreateSessionApiRequestSchema>;
export type SetSessionAgentApiRequest = z.infer<typeof SetSessionAgentApiRequestSchema>;
export type RenameSessionApiRequest = z.infer<typeof RenameSessionApiRequestSchema>;
export type DeleteSessionApiRequest = z.infer<typeof DeleteSessionApiRequestSchema>;
export type ListSessionsApiRequest = z.infer<typeof ListSessionsApiRequestSchema>;
export type ListSessionsApiResponse = z.infer<typeof ListSessionsApiResponseSchema>;
export type ListHistoryMessagesApiRequest = z.infer<typeof ListHistoryMessagesApiRequestSchema>;
export type ListHistoryMessagesApiResponse = z.infer<typeof ListHistoryMessagesApiResponseSchema>;
export type UIMessageApi = z.infer<typeof UIMessageApiSchema>;
export type InitTemporaryAttachmentUploadApiRequest = z.infer<
  typeof InitTemporaryAttachmentUploadApiRequestSchema
>;
export type InitTemporaryAttachmentUploadApiResponse = z.infer<
  typeof InitTemporaryAttachmentUploadApiResponseSchema
>;
