import { z } from 'zod';

import { JavaLongIdSchema, OpaqueIdSchema } from '@/apis/schema';

const ResourceIdsSchema = z.array(OpaqueIdSchema).min(1);

export const SetPersonalResourcesPathTagApiRequestSchema = z.strictObject({
  resourceIds: ResourceIdsSchema,
  targetPathTagId: OpaqueIdSchema,
});

export const MovePersonalResourcesToTrashApiRequestSchema = z.strictObject({
  resourceIds: ResourceIdsSchema,
});

export const ReplacePersonalNormalTagsApiRequestSchema = z.strictObject({
  resourceIds: ResourceIdsSchema,
  normalTagIds: z.array(OpaqueIdSchema),
});

export const MountResourcesToGroupApiRequestSchema = z.strictObject({
  resourceIds: ResourceIdsSchema,
  groupId: JavaLongIdSchema,
  targetTagId: OpaqueIdSchema,
});

export const UnmountResourcesToGroupApiRequestSchema = z.strictObject({
  groupId: JavaLongIdSchema,
  resourceSourceTagMap: z
    .record(OpaqueIdSchema, OpaqueIdSchema)
    .refine((value) => Object.keys(value).length > 0),
});

export const MoveResourcesInGroupApiRequestSchema = UnmountResourcesToGroupApiRequestSchema.extend({
  targetTagId: OpaqueIdSchema,
});

export const ResourcePlacementApiResponseSchema = z.object({
  resourceCount: z.number().int().nonnegative(),
});

export type SetPersonalResourcesPathTagApiRequest = z.infer<
  typeof SetPersonalResourcesPathTagApiRequestSchema
>;
export type MovePersonalResourcesToTrashApiRequest = z.infer<
  typeof MovePersonalResourcesToTrashApiRequestSchema
>;
export type ReplacePersonalNormalTagsApiRequest = z.infer<
  typeof ReplacePersonalNormalTagsApiRequestSchema
>;
export type MountResourcesToGroupApiRequest = z.infer<typeof MountResourcesToGroupApiRequestSchema>;
export type UnmountResourcesToGroupApiRequest = z.infer<
  typeof UnmountResourcesToGroupApiRequestSchema
>;
export type MoveResourcesInGroupApiRequest = z.infer<typeof MoveResourcesInGroupApiRequestSchema>;
export type ResourcePlacementApiResponse = z.infer<typeof ResourcePlacementApiResponseSchema>;
