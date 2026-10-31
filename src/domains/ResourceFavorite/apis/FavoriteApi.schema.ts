import { z } from 'zod';

import {
  createPageResponseSchema,
  EpochMillisSchema,
  NonBlankStringSchema,
  NullableStringSchema,
  OpaqueIdSchema,
  PageApiRequestSchema,
} from '@/apis/schema';
import { ResourceItemApiSchema } from '@/domains/Resource/apis/ResourceCoreApi.schema';

export const ChangeFavoriteStatusApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  favorite: z.boolean(),
  collectionIds: z.array(OpaqueIdSchema).optional(),
});

export const CreateCollectionApiRequestSchema = z.strictObject({
  collectionName: NonBlankStringSchema,
  description: z.string().nullable().optional(),
});

export const UpdateCollectionInfoApiRequestSchema = z.strictObject({
  collectionId: OpaqueIdSchema,
  collectionName: NonBlankStringSchema,
  description: z.string().nullable(),
});

export const DeleteCollectionApiRequestSchema = z.strictObject({
  collectionId: OpaqueIdSchema,
  keepResourcesToDefault: z.boolean().optional(),
});

export const GetFavoriteStatusApiResponseSchema = z.object({
  collectionIds: z.array(OpaqueIdSchema),
});

export const FavoriteCollectionApiSchema = z.object({
  collectionId: OpaqueIdSchema,
  collectionName: NonBlankStringSchema,
  description: NullableStringSchema,
  isDefault: z.boolean(),
  itemCount: z.number().int().nonnegative(),
  createTime: EpochMillisSchema,
});

export const FavoriteItemApiSchema = z.object({
  resourceId: OpaqueIdSchema,
  resourceInfo: ResourceItemApiSchema.nullable(),
  favoritedAt: EpochMillisSchema,
  collectionIds: z.array(OpaqueIdSchema),
  accessible: z.boolean(),
});

export const ListFavoritedResourcesApiRequestSchema = PageApiRequestSchema.extend({
  collectionId: OpaqueIdSchema.optional(),
  size: z.number().int().min(1).max(100),
});

export const ListFavoritedResourcesApiResponseSchema =
  createPageResponseSchema(FavoriteItemApiSchema);

export type ChangeFavoriteStatusApiRequest = z.infer<typeof ChangeFavoriteStatusApiRequestSchema>;
export type CreateCollectionApiRequest = z.infer<typeof CreateCollectionApiRequestSchema>;
export type UpdateCollectionInfoApiRequest = z.infer<typeof UpdateCollectionInfoApiRequestSchema>;
export type DeleteCollectionApiRequest = z.infer<typeof DeleteCollectionApiRequestSchema>;
export type GetFavoriteStatusApiResponse = z.infer<typeof GetFavoriteStatusApiResponseSchema>;
export type FavoriteCollectionApiResponse = z.infer<typeof FavoriteCollectionApiSchema>;
export type FavoriteItemApiResponse = z.infer<typeof FavoriteItemApiSchema>;
export type ListFavoritedResourcesApiRequest = z.infer<
  typeof ListFavoritedResourcesApiRequestSchema
>;
export type ListFavoritedResourcesApiResponse = z.infer<
  typeof ListFavoritedResourcesApiResponseSchema
>;
