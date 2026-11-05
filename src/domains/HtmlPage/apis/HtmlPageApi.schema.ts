import { z } from 'zod';

import { EpochMillisSchema, JavaLongStringSchema, OpaqueIdSchema } from '@/apis/schema';
import { ResourceItemApiSchema } from '@/domains/Resource/apis/ResourceCoreApi.schema';

export const SingleHtmlPageStatusApiSchema = z.enum([
  'UPLOADING',
  'UPLOADED',
  'REGISTERING_RES',
  'READY',
  'REGISTERING_RES_TIMEOUT',
  'FAILED',
]);

const SingleHtmlPageTargetVersionSchema = z.number().int().positive().optional();

export const GetSingleHtmlPageInfoApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  targetVersion: SingleHtmlPageTargetVersionSchema,
});

export const SingleHtmlPageVersionInfoApiSchema = z.object({
  singleHtmlPageId: OpaqueIdSchema,
  resourceId: OpaqueIdSchema,
  version: z.number().int().positive(),
  singleHtmlPageStatus: SingleHtmlPageStatusApiSchema,
  // 上传任务创建后、文件完成落盘前，后端的 size 仍为 null。
  size: JavaLongStringSchema.nullable(),
  // 现网历史版本可能没有 CreatedDate 审计值，但 updateTime 仍可用于展示。
  createTime: EpochMillisSchema.nullable(),
  updateTime: EpochMillisSchema,
});

export const SingleHtmlPageInfoApiResponseSchema = z.object({
  resourceInfo: ResourceItemApiSchema,
  currentVersion: z.number().int().nonnegative(),
  versionInfo: SingleHtmlPageVersionInfoApiSchema.nullable(),
});

export const GetSingleHtmlPageContentApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  targetVersion: SingleHtmlPageTargetVersionSchema,
});

export const GetSingleHtmlPageContentApiResponseSchema = z.string();

export type SingleHtmlPageStatusApiValue = z.infer<typeof SingleHtmlPageStatusApiSchema>;
export type GetSingleHtmlPageInfoApiRequest = z.infer<typeof GetSingleHtmlPageInfoApiRequestSchema>;
export type SingleHtmlPageInfoApiResponse = z.infer<typeof SingleHtmlPageInfoApiResponseSchema>;
export type SingleHtmlPageVersionInfoApiResponse = z.infer<
  typeof SingleHtmlPageVersionInfoApiSchema
>;
export type GetSingleHtmlPageContentApiRequest = z.infer<
  typeof GetSingleHtmlPageContentApiRequestSchema
>;
