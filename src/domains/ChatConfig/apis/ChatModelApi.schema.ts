import { z } from 'zod';

import { DecimalStringSchema, NonEmptyStringSchema, ObjectIdStringSchema } from '@/apis/schema';

export const ModelScopeApiSchema = z.enum(['SYSTEM', 'USER']);
export const ModelFamilyApiSchema = z.enum(['QWEN', 'GPT', 'CLAUDE', 'GEMINI', 'GENERIC']);
export const ProviderTypeApiSchema = z.enum([
  'ALIBABA',
  'OPENAI',
  'ANTHROPIC',
  'GOOGLE',
  'OPENAI_COMPATIBLE',
]);

const UrlOrNullSchema = z
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
    );
  })
  .nullable();

export const ModelProviderMappingApiSchema = z.object({
  model_id: ObjectIdStringSchema,
  provider_id: ObjectIdStringSchema,
  provider_name: NonEmptyStringSchema.nullable(),
  provider_model_name: NonEmptyStringSchema,
  input_billing_ratio: DecimalStringSchema,
  cached_input_billing_ratio: DecimalStringSchema,
  output_billing_ratio: DecimalStringSchema,
  support_runtime_options: z.record(z.string(), z.unknown()),
  is_preferred: z.boolean(),
  is_active: z.boolean(),
  priority: z.number().int(),
});

export const ModelApiSchema = z.object({
  id: ObjectIdStringSchema,
  scope: ModelScopeApiSchema,
  display_name: NonEmptyStringSchema,
  model_family: ModelFamilyApiSchema,
  support_thinking: z.boolean(),
  support_vision: z.boolean(),
  support_tools: z.boolean(),
  context_window_tokens: z.number().int().positive().nullable(),
  max_output_tokens: z.number().int().positive().nullable(),
  is_active: z.boolean(),
  mappings: z.array(ModelProviderMappingApiSchema).nullable(),
});

export const ListAvailableModelsApiResponseSchema = z.object({
  system_models: z.array(ModelApiSchema),
  user_models: z.array(ModelApiSchema),
});

export const ListModelsApiRequestSchema = z.strictObject({
  model_scope: ModelScopeApiSchema,
});

export const ListModelsApiResponseSchema = z.object({
  models: z.array(ModelApiSchema),
});

export const ProviderApiSchema = z.object({
  id: ObjectIdStringSchema,
  name: NonEmptyStringSchema,
  base_url: UrlOrNullSchema,
  api_key_fingerprint: NonEmptyStringSchema.nullable(),
  scope: ModelScopeApiSchema,
  type: ProviderTypeApiSchema,
  is_active: z.boolean(),
  input_tokens: z.number().int().nonnegative(),
  cached_input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  billable_tokens: z.number().int().nonnegative(),
});

export const ListUserProvidersApiResponseSchema = z.object({
  providers: z.array(ProviderApiSchema),
});

export const CreateUserProviderApiRequestSchema = z.strictObject({
  name: NonEmptyStringSchema,
  type: ProviderTypeApiSchema,
  api_key: NonEmptyStringSchema,
  base_url: UrlOrNullSchema.optional(),
  is_active: z.boolean().optional(),
});

export const UpdateUserProviderApiRequestSchema = z.strictObject({
  provider_id: ObjectIdStringSchema,
  name: NonEmptyStringSchema.optional(),
  base_url: UrlOrNullSchema.optional(),
  api_key: NonEmptyStringSchema.optional(),
  type: ProviderTypeApiSchema.optional(),
  is_active: z.boolean().optional(),
});

export const DeleteUserProviderApiRequestSchema = z.strictObject({
  provider_id: ObjectIdStringSchema,
});

export const CreateUserModelApiRequestSchema = z.strictObject({
  display_name: NonEmptyStringSchema,
  model_family: ModelFamilyApiSchema.optional(),
  support_thinking: z.boolean().optional(),
  support_vision: z.boolean().optional(),
  support_tools: z.boolean().optional(),
  context_window_tokens: z.number().int().positive().nullable().optional(),
  max_output_tokens: z.number().int().positive().nullable().optional(),
});

export const UpdateUserModelApiRequestSchema = CreateUserModelApiRequestSchema.partial().extend({
  model_id: ObjectIdStringSchema,
  is_active: z.boolean().optional(),
});

export const DeleteUserModelApiRequestSchema = z.strictObject({
  model_id: ObjectIdStringSchema,
});

export const BindModelProviderApiRequestSchema = z.strictObject({
  model_id: ObjectIdStringSchema,
  provider_id: ObjectIdStringSchema,
  provider_model_name: NonEmptyStringSchema,
  input_billing_ratio: DecimalStringSchema.optional(),
  cached_input_billing_ratio: DecimalStringSchema.optional(),
  output_billing_ratio: DecimalStringSchema.optional(),
  is_preferred: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const UnbindModelProviderApiRequestSchema = z.strictObject({
  model_id: ObjectIdStringSchema,
  provider_id: ObjectIdStringSchema,
});

export type ModelScopeApi = z.infer<typeof ModelScopeApiSchema>;
export type ModelFamilyApi = z.infer<typeof ModelFamilyApiSchema>;
export type ProviderTypeApi = z.infer<typeof ProviderTypeApiSchema>;
export type ModelProviderMappingResponse = z.infer<typeof ModelProviderMappingApiSchema>;
export type ModelResponse = z.infer<typeof ModelApiSchema>;
export type ProviderApiResponse = z.infer<typeof ProviderApiSchema>;
export type ListAvailableModelsApiResponse = z.infer<typeof ListAvailableModelsApiResponseSchema>;
export type ListModelsApiRequest = z.infer<typeof ListModelsApiRequestSchema>;
export type ListModelsApiResponse = z.infer<typeof ListModelsApiResponseSchema>;
export type ListUserProvidersApiResponse = z.infer<typeof ListUserProvidersApiResponseSchema>;
export type CreateUserProviderApiRequest = z.infer<typeof CreateUserProviderApiRequestSchema>;
export type UpdateUserProviderApiRequest = z.infer<typeof UpdateUserProviderApiRequestSchema>;
export type DeleteUserProviderApiRequest = z.infer<typeof DeleteUserProviderApiRequestSchema>;
export type CreateUserModelApiRequest = z.infer<typeof CreateUserModelApiRequestSchema>;
export type UpdateUserModelApiRequest = z.infer<typeof UpdateUserModelApiRequestSchema>;
export type DeleteUserModelApiRequest = z.infer<typeof DeleteUserModelApiRequestSchema>;
export type BindModelProviderApiRequest = z.infer<typeof BindModelProviderApiRequestSchema>;
export type UnbindModelProviderApiRequest = z.infer<typeof UnbindModelProviderApiRequestSchema>;
