import type { Config } from '@onlyoffice/doceditor-types';
import { z } from 'zod';

import {
  JavaLongIdSchema,
  JavaLongStringSchema,
  NonBlankStringSchema,
  NonEmptyStringSchema,
  NullableStringSchema,
  OpaqueIdSchema,
} from '@/apis/schema';
import {
  ResourceItemApiSchema,
  ResourceTypeApiSchema,
} from '@/domains/Resource/apis/ResourceCoreApi.schema';
import { UserDisplayApiSchema } from '@/domains/User/apis/UserInformationApi.schema';

export const DocumentStatusApiSchema = z.enum([
  'UPLOADING',
  'UPLOADED',
  'CONVERTING_AND_PARSING',
  'REGISTERING_RES',
  'READY',
  'TRANSFER_TIMEOUT',
  'REGISTERING_RES_TIMEOUT',
  'FAILED',
]);

export const DocumentUploadMetaApiSchema = z.object({
  documentName: NonEmptyStringSchema,
  uploaderId: JavaLongIdSchema,
  fileType: ResourceTypeApiSchema,
  size: JavaLongStringSchema,
  mountTargetTagId: NullableStringSchema,
});

export const DocumentProcessStatusApiSchema = z.object({
  status: DocumentStatusApiSchema,
  errorMessage: NullableStringSchema,
});

export const DocumentVersionInfoApiSchema = z.object({
  version: z.number().int().nonnegative(),
  uploadMeta: DocumentUploadMetaApiSchema,
  documentStatus: DocumentProcessStatusApiSchema,
  maxPreviewPages: z.number().int().nonnegative().nullable(),
});

/** listPendingDocs 的 Controller 静态类型是 Base；历史实现实际序列化版本实体。 */
export const PendingDocItemApiSchema = z.object({
  documentId: OpaqueIdSchema.optional(),
  version: z.number().int().nonnegative().optional(),
  uploadMeta: DocumentUploadMetaApiSchema,
  documentStatus: DocumentProcessStatusApiSchema,
  maxPreviewPages: z.number().int().nonnegative().nullable(),
});

export const UploadDocApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema.optional(),
  filename: NonBlankStringSchema,
  extension: z.enum(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']),
  md5: z.string().regex(/^[a-f\d]{32}$/i, '必须是 MD5 十六进制字符串'),
  expectedSize: z.number().int().nonnegative(),
  mountTargetTagId: OpaqueIdSchema.optional(),
});

export const UploadDocApiResponseSchema = z.object({
  documentId: OpaqueIdSchema,
  putUrl: NonEmptyStringSchema.nullable(),
  callbackHeader: NonEmptyStringSchema.nullable(),
  objectKey: NonEmptyStringSchema,
  flashUploaded: z.boolean(),
});

export const DocumentIdApiRequestSchema = z.strictObject({
  documentId: OpaqueIdSchema,
});

export const ListPendingDocsApiResponseSchema = z.array(PendingDocItemApiSchema);

export const SyncDocStatusApiResponseSchema = DocumentProcessStatusApiSchema;

export const GetDocInfoApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  targetVersion: z.number().int().positive().optional(),
});

export const GetDocInfoApiResponseSchema = z.object({
  resourceInfo: ResourceItemApiSchema,
  documentVersionInfo: DocumentVersionInfoApiSchema.nullable(),
  updateTime: z.number().int().refine(Number.isSafeInteger),
  authorsDisplay: z.record(JavaLongIdSchema, UserDisplayApiSchema.nullable()).nullable(),
});

export const ForkDocumentApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  forkedResourceVersion: z.number().int().positive().optional(),
  forkedResourceName: NonBlankStringSchema,
});

export const ForkDocumentApiResponseSchema = OpaqueIdSchema;

export const GetOnlyOfficeEditorConfigApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
});

/** ONLYOFFICE Config 是第三方版本化对象，只约束 JSON 对象边界。 */
export const OnlyOfficeEditorConfigApiSchema = z.custom<Config>(
  (value) => value !== null && typeof value === 'object' && !Array.isArray(value),
  { message: '必须是 ONLYOFFICE 配置对象' }
);

export const GetOnlyOfficeEditorConfigApiResponseSchema = z.object({
  sessionId: NonEmptyStringSchema,
  config: OnlyOfficeEditorConfigApiSchema.nullable(),
});

export type DocumentStatusApiValue = z.infer<typeof DocumentStatusApiSchema>;
export type DocumentProcessStatusApi = z.infer<typeof DocumentProcessStatusApiSchema>;
export type DocumentVersionInfoApi = z.infer<typeof DocumentVersionInfoApiSchema>;
export type PendingDocItemApi = z.infer<typeof PendingDocItemApiSchema>;
export type UploadDocApiRequest = z.infer<typeof UploadDocApiRequestSchema>;
export type UploadDocApiResponse = z.infer<typeof UploadDocApiResponseSchema>;
export type DocumentIdApiRequest = z.infer<typeof DocumentIdApiRequestSchema>;
export type ListPendingDocsApiResponse = z.infer<typeof ListPendingDocsApiResponseSchema>;
export type GetDocInfoApiRequest = z.infer<typeof GetDocInfoApiRequestSchema>;
export type GetDocInfoApiResponse = z.infer<typeof GetDocInfoApiResponseSchema>;
export type ForkDocumentApiRequest = z.infer<typeof ForkDocumentApiRequestSchema>;
export type GetOnlyOfficeEditorConfigApiRequest = z.infer<
  typeof GetOnlyOfficeEditorConfigApiRequestSchema
>;
export type GetOnlyOfficeEditorConfigApiResponse = z.infer<
  typeof GetOnlyOfficeEditorConfigApiResponseSchema
>;
