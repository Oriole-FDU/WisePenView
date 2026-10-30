import { z } from 'zod';

import { NonBlankStringSchema, OpaqueIdSchema } from '@/apis/schema';
import {
  AIResourceInfoApiSchema,
  AIResourceSourceTypeApiSchema,
  CancelUploadAssetsApiRequestSchema,
  InitUploadAssetApiItemSchema,
  InitUploadAssetsApiResponseSchema,
  VersionBundleApiSchema,
} from '@/domains/_shared/apis/versionAssetApi.schema';
import { ResourceItemApiSchema } from '@/domains/Resource/apis/ResourceCoreApi.schema';

const TargetVersionApiSchema = z.number().int().positive().optional();

const AgentModelPolicyApiSchema = z.object({
  defaultModelId: z.string().nullable(),
  defaultProviderId: z.string().nullable(),
  allowRequestOverride: z.boolean().nullable(),
});

const AgentToolAndSkillPolicyApiSchema = z.object({
  enableUseTool: z.boolean().nullable(),
  toolSelectionDefaultEnabled: z.boolean().nullable(),
  toolSelectionOverrides: z.record(z.string(), z.boolean()).nullable(),
  enableUseSkill: z.boolean().nullable(),
  onDemandSkillIds: z.array(OpaqueIdSchema).nullable(),
  skillMatchTopK: z.number().int().nullable(),
});

const AgentMemoryPolicyApiSchema = z.object({
  enableChatMemory: z.boolean().nullable(),
  enablePersistenceChatMemory: z.boolean().nullable(),
  enableChatMemorySummary: z.boolean().nullable(),
  highWatermarkRatio: z.number().nullable(),
  lowWatermarkRatio: z.number().nullable(),
  summaryPrompt: z.string().nullable(),
  enableLongTermMemory: z.boolean().nullable(),
  longTermMemoryLimit: z.number().int().nullable(),
  longTermMemoryScoreThreshold: z.number().nullable(),
});

export const AgentSpecApiSchema = z.object({
  systemPrompt: z.string().nullable(),
  autoGenerateTitle: z.boolean().nullable(),
  modelPolicy: AgentModelPolicyApiSchema.nullable(),
  toolAndSkillPolicy: AgentToolAndSkillPolicyApiSchema.nullable(),
  memoryPolicy: AgentMemoryPolicyApiSchema.nullable(),
});

export const AgentSpecRequestSchema = z.strictObject({
  systemPrompt: z.string().nullable(),
  autoGenerateTitle: z.boolean().nullable(),
  modelPolicy: z
    .strictObject({
      defaultModelId: z.string().nullable(),
      defaultProviderId: z.string().nullable(),
      allowRequestOverride: z.boolean().nullable(),
    })
    .nullable(),
  toolAndSkillPolicy: z
    .strictObject({
      enableUseTool: z.boolean().nullable(),
      toolSelectionDefaultEnabled: z.boolean().nullable(),
      toolSelectionOverrides: z.record(z.string(), z.boolean()).nullable(),
      enableUseSkill: z.boolean().nullable(),
      onDemandSkillIds: z.array(OpaqueIdSchema).nullable(),
      skillMatchTopK: z.number().int().nullable(),
    })
    .nullable(),
  memoryPolicy: z
    .strictObject({
      enableChatMemory: z.boolean().nullable(),
      enablePersistenceChatMemory: z.boolean().nullable(),
      enableChatMemorySummary: z.boolean().nullable(),
      highWatermarkRatio: z.number().nullable(),
      lowWatermarkRatio: z.number().nullable(),
      summaryPrompt: z.string().nullable(),
      enableLongTermMemory: z.boolean().nullable(),
      longTermMemoryLimit: z.number().int().nullable(),
      longTermMemoryScoreThreshold: z.number().nullable(),
    })
    .nullable(),
});

export const CreateAgentApiRequestSchema = z.strictObject({
  title: NonBlankStringSchema,
  name: z.string().optional(),
  description: z.string().optional(),
  mountTargetTagId: OpaqueIdSchema.optional(),
  sourceType: AIResourceSourceTypeApiSchema.optional(),
});

export const AgentResourceIdApiResponseSchema = OpaqueIdSchema;

export const ForkAgentApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  forkedResourceVersion: TargetVersionApiSchema,
  forkedResourceName: NonBlankStringSchema,
});

export const GetAgentInfoApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  targetVersion: TargetVersionApiSchema,
});

export const AgentInfoApiResponseSchema = z.object({
  resourceInfo: ResourceItemApiSchema,
  agentInfo: AIResourceInfoApiSchema,
});

export const GetAgentVersionBundleInfoApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  version: z.number().int().positive(),
});

export const AgentVersionBundleApiResponseSchema = VersionBundleApiSchema.extend({
  resourceId: OpaqueIdSchema,
  spec: AgentSpecApiSchema.nullable(),
});

export const UpdateAgentInfoApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  name: z.string().optional(),
  description: z.string().optional(),
});

export const UpdateAgentSpecApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  draftVersion: z.number().int().positive(),
  spec: AgentSpecRequestSchema,
});

export const PublishAgentVersionApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
});

export const InitUploadAgentAssetsApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  draftVersion: z.number().int().positive(),
  assets: z.array(InitUploadAssetApiItemSchema).min(1),
});

export const InitUploadAgentAssetsApiResponseSchema = InitUploadAssetsApiResponseSchema;

export const DeleteAgentAssetsApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  draftVersion: z.number().int().positive(),
  assetIds: z.array(OpaqueIdSchema).min(1),
});

export const CancelUploadAgentAssetsApiRequestSchema = CancelUploadAssetsApiRequestSchema;

export type AgentSpecApi = z.infer<typeof AgentSpecApiSchema>;
export type AgentSpecRequest = z.infer<typeof AgentSpecRequestSchema>;
export type CreateAgentApiRequest = z.infer<typeof CreateAgentApiRequestSchema>;
export type ForkAgentApiRequest = z.infer<typeof ForkAgentApiRequestSchema>;
export type GetAgentInfoApiRequest = z.infer<typeof GetAgentInfoApiRequestSchema>;
export type AgentInfoApiResponse = z.infer<typeof AgentInfoApiResponseSchema>;
export type GetAgentVersionBundleInfoApiRequest = z.infer<
  typeof GetAgentVersionBundleInfoApiRequestSchema
>;
export type AgentVersionBundleApiResponse = z.infer<typeof AgentVersionBundleApiResponseSchema>;
export type UpdateAgentInfoApiRequest = z.infer<typeof UpdateAgentInfoApiRequestSchema>;
export type UpdateAgentSpecApiRequest = z.infer<typeof UpdateAgentSpecApiRequestSchema>;
export type PublishAgentVersionApiRequest = z.infer<typeof PublishAgentVersionApiRequestSchema>;
export type InitUploadAgentAssetsApiRequest = z.infer<typeof InitUploadAgentAssetsApiRequestSchema>;
export type InitUploadAgentAssetsApiResponse = z.infer<
  typeof InitUploadAgentAssetsApiResponseSchema
>;
export type DeleteAgentAssetsApiRequest = z.infer<typeof DeleteAgentAssetsApiRequestSchema>;
export type { CancelUploadAssetsApiRequest } from '@/domains/_shared/apis/versionAssetApi.schema';
