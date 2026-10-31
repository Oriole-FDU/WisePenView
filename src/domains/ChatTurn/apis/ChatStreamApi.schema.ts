import { z } from 'zod';

import { NonEmptyStringSchema, ObjectIdStringSchema, OpaqueIdSchema } from '@/apis/schema';

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

export type ClientToolCapabilityApi = z.infer<typeof ClientToolCapabilityApiSchema>;
export type ChatCompletionApiRequest = z.infer<typeof ChatCompletionApiRequestSchema>;
export type ChatRecoverApiRequest = z.infer<typeof ChatRecoverApiRequestSchema>;
export type ChatStreamReconnectApiRequest = z.infer<typeof ChatStreamReconnectApiRequestSchema>;
