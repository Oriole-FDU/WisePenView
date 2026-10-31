import { z } from 'zod';

import { OpaqueIdSchema } from '@/apis/schema';

export const ResourceInteractionApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
});

export const ResourceLikeApiRequestSchema = ResourceInteractionApiRequestSchema;

export const RateApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  score: z.number().int().min(1).max(5),
});

export const GetUserInteractionRecordApiResponseSchema = z.object({
  read: z.boolean(),
  liked: z.boolean(),
  score: z.number().int().min(1).max(5).nullable(),
  likedCommentIds: z.array(OpaqueIdSchema),
  resourceId: OpaqueIdSchema,
});

export type ResourceInteractionApiRequest = z.infer<typeof ResourceInteractionApiRequestSchema>;
export type ResourceLikeApiRequest = z.infer<typeof ResourceLikeApiRequestSchema>;
export type RateApiRequest = z.infer<typeof RateApiRequestSchema>;
export type GetUserInteractionRecordApiResponse = z.infer<
  typeof GetUserInteractionRecordApiResponseSchema
>;
