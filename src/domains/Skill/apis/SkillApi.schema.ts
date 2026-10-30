import { z } from 'zod';

import { NonBlankStringSchema, OpaqueIdSchema } from '@/apis/schema';
import { OssStsTokenApiSchema } from '@/domains/_shared/apis/ossStsApi.schema';
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

export const CreateSkillApiRequestSchema = z.strictObject({
  title: NonBlankStringSchema,
  name: z.string().optional(),
  description: z.string().optional(),
  mountTargetTagId: OpaqueIdSchema.optional(),
  sourceType: AIResourceSourceTypeApiSchema.optional(),
});

export const SkillResourceIdApiResponseSchema = OpaqueIdSchema;

export const ForkSkillApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  forkedResourceVersion: TargetVersionApiSchema,
  forkedResourceName: NonBlankStringSchema,
});

export const GetSkillInfoApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  targetVersion: TargetVersionApiSchema,
});

export const SkillInfoApiResponseSchema = z.object({
  resourceInfo: ResourceItemApiSchema,
  skillInfo: AIResourceInfoApiSchema,
});

export const GetSkillVersionBundleInfoApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  version: z.number().int().positive(),
});

export const SkillVersionBundleApiResponseSchema = VersionBundleApiSchema.extend({
  resourceId: OpaqueIdSchema,
});

export const GetSkillAssetStsTokenApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  targetVersion: TargetVersionApiSchema,
});

export const GetSkillAssetStsTokenApiResponseSchema = OssStsTokenApiSchema;

export const UpdateSkillInfoApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  name: z.string().optional(),
  description: z.string().optional(),
});

export const InitUploadSkillAssetsApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  draftVersion: z.number().int().positive(),
  assets: z.array(InitUploadAssetApiItemSchema).min(1),
});

export const InitUploadSkillAssetsApiResponseSchema = InitUploadAssetsApiResponseSchema;

export const DeleteSkillAssetsApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  draftVersion: z.number().int().positive(),
  assetIds: z.array(OpaqueIdSchema).min(1),
});

export const CancelUploadSkillAssetsApiRequestSchema = CancelUploadAssetsApiRequestSchema;

export const PublishSkillVersionApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
});

export type CreateSkillApiRequest = z.infer<typeof CreateSkillApiRequestSchema>;
export type ForkSkillApiRequest = z.infer<typeof ForkSkillApiRequestSchema>;
export type GetSkillInfoApiRequest = z.infer<typeof GetSkillInfoApiRequestSchema>;
export type SkillInfoApiResponse = z.infer<typeof SkillInfoApiResponseSchema>;
export type GetSkillVersionBundleInfoApiRequest = z.infer<
  typeof GetSkillVersionBundleInfoApiRequestSchema
>;
export type SkillVersionBundleApiResponse = z.infer<typeof SkillVersionBundleApiResponseSchema>;
export type SkillAssetApiInfo = SkillVersionBundleApiResponse['assets'][number];
export type GetSkillAssetStsTokenApiRequest = z.infer<typeof GetSkillAssetStsTokenApiRequestSchema>;
export type GetSkillAssetStsTokenApiResponse = z.infer<
  typeof GetSkillAssetStsTokenApiResponseSchema
>;
export type UpdateSkillInfoApiRequest = z.infer<typeof UpdateSkillInfoApiRequestSchema>;
export type InitUploadSkillAssetsApiRequest = z.infer<typeof InitUploadSkillAssetsApiRequestSchema>;
export type InitUploadSkillAssetsApiResponse = z.infer<
  typeof InitUploadSkillAssetsApiResponseSchema
>;
export type DeleteSkillAssetsApiRequest = z.infer<typeof DeleteSkillAssetsApiRequestSchema>;
export type PublishSkillVersionApiRequest = z.infer<typeof PublishSkillVersionApiRequestSchema>;
export type { CancelUploadAssetsApiRequest } from '@/domains/_shared/apis/versionAssetApi.schema';
