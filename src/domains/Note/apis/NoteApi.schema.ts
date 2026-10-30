import { z } from 'zod';

import {
  createPageResponseSchema,
  EpochMillisSchema,
  JavaLongIdSchema,
  NonBlankStringSchema,
  NonEmptyStringSchema,
  OpaqueIdSchema,
} from '@/apis/schema';
import { ResourceItemApiSchema } from '@/domains/Resource/apis/ResourceCoreApi.schema';
import { UserDisplayApiSchema } from '@/domains/User/apis/UserInformationApi.schema';

const NoteTargetVersionSchema = z.number().int().positive().optional();

export const AddNoteApiRequestSchema = z.strictObject({
  title: NonBlankStringSchema,
  resourceType: z.enum(['NOTE', 'DRAWIO']).optional(),
  mountTargetTagId: OpaqueIdSchema.optional(),
});

export const AddNoteApiResponseSchema = OpaqueIdSchema;

export const GetNoteInfoApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  targetVersion: NoteTargetVersionSchema,
});

export const NoteInfoApiResponseSchema = z.object({
  resourceInfo: ResourceItemApiSchema,
  version: z.number().int().nonnegative(),
  updateTime: EpochMillisSchema,
  authorsDisplay: z.record(JavaLongIdSchema, UserDisplayApiSchema.nullable()).nullable(),
});

export const GetDrawIoLatestSnapshotApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
});

export const GetDrawIoLatestSnapshotApiResponseSchema = z.object({
  resourceId: OpaqueIdSchema,
  version: z.number().int().nonnegative(),
  fullSnapshot: z.string().nullable(),
  deltas: z.array(z.string()).nullable(),
});

export const SaveDrawIoSnapshotApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  version: z.number().int().nonnegative(),
  data: NonEmptyStringSchema,
  plainText: z.string().optional(),
});

export const ForkNoteApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  forkedResourceVersion: NoteTargetVersionSchema,
  forkedResourceName: NonBlankStringSchema.optional(),
  mountTargetTagId: OpaqueIdSchema.optional(),
});

export const ForkNoteApiResponseSchema = OpaqueIdSchema;

export const NoteVersionInfoApiSchema = z.object({
  version: z.number().int().nonnegative(),
  type: z.enum(['FULL', 'DELTA']),
  createdBy: z.array(JavaLongIdSchema),
});

export const ListNoteVersionsApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  page: z.number().int().min(1),
  size: z.number().int().min(1),
});

export const ListNoteVersionsApiResponseSchema = createPageResponseSchema(NoteVersionInfoApiSchema);

export type AddNoteApiRequest = z.infer<typeof AddNoteApiRequestSchema>;
export type AddNoteApiResponse = z.infer<typeof AddNoteApiResponseSchema>;
export type GetNoteInfoApiRequest = z.infer<typeof GetNoteInfoApiRequestSchema>;
export type NoteInfoApiResponse = z.infer<typeof NoteInfoApiResponseSchema>;
export type GetDrawIoLatestSnapshotApiRequest = z.infer<
  typeof GetDrawIoLatestSnapshotApiRequestSchema
>;
export type GetDrawIoLatestSnapshotApiResponse = z.infer<
  typeof GetDrawIoLatestSnapshotApiResponseSchema
>;
export type SaveDrawIoSnapshotApiRequest = z.infer<typeof SaveDrawIoSnapshotApiRequestSchema>;
export type ForkNoteApiRequest = z.infer<typeof ForkNoteApiRequestSchema>;
export type NoteVersionInfoApi = z.infer<typeof NoteVersionInfoApiSchema>;
export type ListNoteVersionsApiRequest = z.infer<typeof ListNoteVersionsApiRequestSchema>;
export type ListNoteVersionsApiResponse = z.infer<typeof ListNoteVersionsApiResponseSchema>;
