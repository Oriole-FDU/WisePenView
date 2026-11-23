import { z } from 'zod';

import {
  IsoDateTimeSchema,
  NonEmptyStringSchema,
  ObjectIdStringSchema,
  OpaqueIdSchema,
} from '@/apis/schema';

export const ActiveChatTurnApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
});

export const ActiveChatTurnApiResponseSchema = z.object({
  turn_id: OpaqueIdSchema.nullable(),
});

export const CancelChatTurnApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
});

export const ClientToolCapabilityApiSchema = z.object({
  name: NonEmptyStringSchema,
  description: z.string(),
  input_schema: z.record(z.string(), z.unknown()),
});

export const ChatCompletionApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
  query: NonEmptyStringSchema,
  model: ObjectIdStringSchema.optional(),
  provider_id: ObjectIdStringSchema.optional(),
  runtime_options: z.record(z.string(), z.unknown()).optional(),
  frontend_states: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  user_defined_attachment_ids: z.array(OpaqueIdSchema).nullable().optional(),
  tool_selection_default_enabled: z.boolean().nullable().optional(),
  tool_selection_overrides: z.record(z.string(), z.boolean()).nullable().optional(),
  user_defined_on_demand_skill_ids: z.array(OpaqueIdSchema).nullable().optional(),
  client_tool_capabilities: z.array(ClientToolCapabilityApiSchema).optional(),
});

export const ClientToolResultSubmissionApiSchema = z
  .strictObject({
    tool_call_id: NonEmptyStringSchema,
    output: z.unknown().optional(),
    error_text: NonEmptyStringSchema.optional(),
  })
  .refine((value) => Number('output' in value) + Number(value.error_text !== undefined) === 1, {
    message: 'output 与 error_text 必须且只能提供一个',
  });

export const ToolApprovalStatusSubmissionApiSchema = z.strictObject({
  tool_call_id: NonEmptyStringSchema,
  approved: z.boolean(),
});

/** 后端 ChatRecoverRequest；respond / recover 共用同一请求体。 */
export const ChatRecoverApiRequestSchema = z
  .strictObject({
    session_id: OpaqueIdSchema,
    client_tool_results: z.array(ClientToolResultSubmissionApiSchema),
    tool_approval_status: z.array(ToolApprovalStatusSubmissionApiSchema),
  })
  .superRefine((value, context) => {
    const resultIds = value.client_tool_results.map((item) => item.tool_call_id);
    const approvalIds = value.tool_approval_status.map((item) => item.tool_call_id);
    if (new Set(resultIds).size !== resultIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['client_tool_results'],
        message: 'tool_call_id 不允许重复',
      });
    }
    if (new Set(approvalIds).size !== approvalIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['tool_approval_status'],
        message: 'tool_call_id 不允许重复',
      });
    }
  });

export const ChatRespondApiRequestSchema = ChatRecoverApiRequestSchema;

export const ChatStreamReconnectApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
});

export const ChatSseEventDataApiSchema = z.union([
  z.literal('[DONE]'),
  z
    .object({
      type: NonEmptyStringSchema,
    })
    .loose(),
]);

const COMPLETION_KEYS = Object.keys(ChatCompletionApiRequestSchema.shape);
const RECOVER_KEYS = Object.keys(ChatRecoverApiRequestSchema.shape);

const pickKnownFields = (value: unknown, keys: readonly string[]): Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return Object.fromEntries(keys.flatMap((key) => (key in record ? [[key, record[key]]] : [])));
};

export const pickChatCompletionApiRequest = (value: unknown): ChatCompletionApiRequest =>
  pickKnownFields(value, COMPLETION_KEYS) as ChatCompletionApiRequest;

export const pickChatRecoverApiRequest = (value: unknown): ChatRecoverApiRequest =>
  pickKnownFields(value, RECOVER_KEYS) as ChatRecoverApiRequest;

export const ListHistoryMessagesApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(100).optional(),
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

const HistoryPageResponseSchema = <ItemSchema extends z.ZodType>(itemSchema: ItemSchema) =>
  z.object({
    list: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    size: z.number().int().min(1),
    total_page: z.number().int().nonnegative(),
  });

export const ListHistoryMessagesApiResponseSchema = HistoryPageResponseSchema(UIMessageApiSchema);

export type ActiveChatTurnApiRequest = z.infer<typeof ActiveChatTurnApiRequestSchema>;
export type ActiveChatTurnApiResponse = z.infer<typeof ActiveChatTurnApiResponseSchema>;
export type CancelChatTurnApiRequest = z.infer<typeof CancelChatTurnApiRequestSchema>;
export type ClientToolCapabilityApi = z.infer<typeof ClientToolCapabilityApiSchema>;
export type ChatCompletionApiRequest = z.infer<typeof ChatCompletionApiRequestSchema>;
export type ChatRecoverApiRequest = z.infer<typeof ChatRecoverApiRequestSchema>;
export type ChatRespondApiRequest = z.infer<typeof ChatRespondApiRequestSchema>;
export type ChatStreamReconnectApiRequest = z.infer<typeof ChatStreamReconnectApiRequestSchema>;
export type ListHistoryMessagesApiRequest = z.infer<typeof ListHistoryMessagesApiRequestSchema>;
export type ListHistoryMessagesApiResponse = z.infer<typeof ListHistoryMessagesApiResponseSchema>;
export type UIMessageApi = z.infer<typeof UIMessageApiSchema>;
