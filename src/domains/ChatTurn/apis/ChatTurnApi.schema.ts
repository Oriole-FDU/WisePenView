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
  .refine(
    (value) => Number(value.output !== undefined) + Number(value.error_text !== undefined) === 1,
    {
      message: 'output 与 error_text 必须且只能提供一个有效值',
    }
  );

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

export const ListHistoryMessagesApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(100).optional(),
});

const NullPartFields = {
  text: z.null(),
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
  createToolPartApiSchema(z.templateLiteral(['tool-', z.string().min(1)])),
  createToolPartApiSchema(z.literal('dynamic-tool'), {
    toolName: NonEmptyStringSchema,
  }),
]);

function createToolPartApiSchema<
  TypeSchema extends z.ZodType<string>,
  ExtraShape extends z.ZodRawShape = Record<never, never>,
>(typeSchema: TypeSchema, extraShape = {} as ExtraShape) {
  const commonShape = {
    ...extraShape,
    type: typeSchema,
    text: z.null(),
    toolCallId: NonEmptyStringSchema,
    input: z.unknown(),
    output: z.unknown().nullable(),
    title: z.string().optional(),
    providerExecuted: z.boolean().optional(),
  };

  return z.discriminatedUnion('state', [
    z.object({
      ...commonShape,
      state: z.literal('input-streaming'),
    }),
    z.object({
      ...commonShape,
      state: z.literal('input-available'),
    }),
    z.object({
      ...commonShape,
      state: z.literal('approval-requested'),
      approval: z
        .object({
          id: NonEmptyStringSchema.optional(),
          signature: z.string().optional(),
        })
        .optional(),
    }),
    z.object({
      ...commonShape,
      state: z.literal('approval-responded'),
      approval: z.object({
        id: NonEmptyStringSchema,
        approved: z.boolean(),
        reason: z.string().optional(),
        signature: z.string().optional(),
      }),
    }),
    z.object({
      ...commonShape,
      state: z.literal('output-available'),
      preliminary: z.boolean().optional(),
    }),
    z.object({
      ...commonShape,
      state: z.literal('output-error'),
      errorText: NonEmptyStringSchema,
    }),
    z.object({
      ...commonShape,
      state: z.literal('output-denied'),
      approval: z.object({
        id: NonEmptyStringSchema,
        approved: z.literal(false),
        reason: z.string().optional(),
        signature: z.string().optional(),
      }),
    }),
  ]);
}

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
