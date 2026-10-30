import { z } from 'zod';

import { NonEmptyStringSchema, NullableStringSchema, OpaqueIdSchema } from '@/apis/schema';

export const ToolSelectionModeApiSchema = z.enum(['user_selectable', 'contextual']);

export const ToolSourceApiSchema = z.object({
  type: NonEmptyStringSchema,
  server_id: OpaqueIdSchema.nullable(),
  server_display_name: NullableStringSchema,
  remote_name: NullableStringSchema,
});

export const ToolApiSchema = z.object({
  name: NonEmptyStringSchema,
  display_name: NonEmptyStringSchema,
  description: z.string(),
  selection_mode: ToolSelectionModeApiSchema,
  requires_config: z.boolean(),
  configured: z.boolean(),
  enabled: z.boolean(),
  source: ToolSourceApiSchema.nullable(),
  missing_config_keys: z.array(NonEmptyStringSchema),
  config_schema: z.record(z.string(), z.unknown()),
  secret_fingerprints: z.record(z.string(), z.string()),
});

export const ListToolsApiResponseSchema = z.object({
  tools: z.array(ToolApiSchema),
});

export const UpdateUserToolConfigApiRequestSchema = z.strictObject({
  tool_name: NonEmptyStringSchema,
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  secret_config: z.record(z.string(), z.string()).optional(),
});

export const DeleteUserToolConfigApiRequestSchema = z.strictObject({
  tool_name: NonEmptyStringSchema,
});

export type ToolApiResponse = z.infer<typeof ToolApiSchema>;
export type ListToolsApiResponse = z.infer<typeof ListToolsApiResponseSchema>;
export type UpdateUserToolConfigApiRequest = z.infer<typeof UpdateUserToolConfigApiRequestSchema>;
export type DeleteUserToolConfigApiRequest = z.infer<typeof DeleteUserToolConfigApiRequestSchema>;
