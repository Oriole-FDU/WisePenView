import { z } from 'zod';

import {
  EpochMillisSchema,
  JavaLongStringSchema,
  NonBlankStringSchema,
  NonEmptyStringSchema,
  OpaqueIdSchema,
} from '@/apis/schema';

export const AssetResourceTypeApiSchema = z.enum([
  'MD',
  'PYTHON_SCRIPT',
  'TEXT',
  'JSON',
  'YAML',
  'TOML',
]);

export const AssetUploadStatusApiSchema = z.enum(['UPLOADING', 'AVAILABLE']);

export const VersionStatusApiSchema = z.enum(['DRAFT', 'PUBLISHED']);

export const AIResourceSourceTypeApiSchema = z.enum(['MANUAL', 'BY_AGENT']);

export const AssetPendingUploadApiSchema = z.object({
  objectKey: NonEmptyStringSchema,
  assetResourceType: AssetResourceTypeApiSchema,
  expectedSize: JavaLongStringSchema,
  createTime: EpochMillisSchema,
});

export const VersionAssetInfoApiSchema = z.object({
  id: NonEmptyStringSchema,
  name: NonBlankStringSchema,
  path: NonEmptyStringSchema,
  objectKey: NonEmptyStringSchema.nullable(),
  assetResourceType: AssetResourceTypeApiSchema,
  uploadStatus: AssetUploadStatusApiSchema,
  size: JavaLongStringSchema.nullable(),
  pendingUpload: AssetPendingUploadApiSchema.nullable(),
});

export const VersionBundleApiSchema = z.object({
  version: z.number().int().positive(),
  status: VersionStatusApiSchema,
  assets: z.array(VersionAssetInfoApiSchema),
});

export const AIResourceInfoApiSchema = z.object({
  resourceId: OpaqueIdSchema,
  name: z.string().nullable(),
  description: z.string().nullable(),
  version: z.number().int().nonnegative(),
  sourceType: AIResourceSourceTypeApiSchema,
  updateTime: EpochMillisSchema,
});

export const InitUploadAssetApiItemSchema = z.strictObject({
  name: NonBlankStringSchema.refine((value) => !value.includes('/'), {
    message: '文件名不能包含路径分隔符',
  }),
  path: NonEmptyStringSchema.refine((value) => value.startsWith('/'), {
    message: '资产路径必须以 / 开头',
  }),
  assetResourceType: AssetResourceTypeApiSchema,
  md5: z
    .string()
    .regex(/^[a-f\d]{32}$/i, '必须是 MD5 十六进制字符串')
    .optional(),
  expectedSize: z.number().int().nonnegative().optional(),
});

export const AssetUploadTicketApiSchema = z.object({
  assetId: OpaqueIdSchema,
  path: NonEmptyStringSchema,
  name: NonBlankStringSchema,
  objectKey: NonEmptyStringSchema,
  putUrl: NonEmptyStringSchema.nullable(),
  callbackHeader: NonEmptyStringSchema.nullable(),
  flashUploaded: z.boolean(),
});

export const InitUploadAssetsApiResponseSchema = z.object({
  resourceId: OpaqueIdSchema,
  version: z.number().int().positive(),
  assetUploadTickets: z.array(AssetUploadTicketApiSchema),
});

export const CancelUploadAssetsApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  draftVersion: z.number().int().positive(),
  uploads: z
    .array(
      z.strictObject({
        assetId: OpaqueIdSchema,
        objectKey: OpaqueIdSchema,
      })
    )
    .min(1),
});

export type VersionStatusApiValue = z.infer<typeof VersionStatusApiSchema>;
export type AssetUploadStatusApiValue = z.infer<typeof AssetUploadStatusApiSchema>;
export type AssetResourceTypeApiValue = z.infer<typeof AssetResourceTypeApiSchema>;
export type AIResourceSourceTypeApiValue = z.infer<typeof AIResourceSourceTypeApiSchema>;
export type VersionAssetInfoApi = z.infer<typeof VersionAssetInfoApiSchema>;
export type VersionBundleApi = z.infer<typeof VersionBundleApiSchema>;
export type AIResourceInfoApi = z.infer<typeof AIResourceInfoApiSchema>;
export type InitUploadAssetApiItem = z.infer<typeof InitUploadAssetApiItemSchema>;
export type AssetUploadTicketApiResponse = z.infer<typeof AssetUploadTicketApiSchema>;
export type InitUploadAssetsApiResponse = z.infer<typeof InitUploadAssetsApiResponseSchema>;
export type CancelUploadAssetsApiRequest = z.infer<typeof CancelUploadAssetsApiRequestSchema>;
