import { z } from 'zod';

export const TourCodeApiSchema = z.enum([
  'SYSTEM_FEATURES_TOUR',
  'COURSE_FEATURES_TOUR',
  'AI_CHAT_FEATURES_TOUR',
  'NOTE_FEATURES_TOUR',
  'DRIVE_FEATURES_TOUR',
]);

export const UserTourStatusApiSchema = z.object({
  tourCode: TourCodeApiSchema,
  completed: z.boolean(),
});

export const ListUserTourStatusApiResponseSchema = z.array(UserTourStatusApiSchema);

export const CompleteTourApiRequestSchema = z.strictObject({
  tourCode: TourCodeApiSchema,
});

export type TourCodeApiValue = z.infer<typeof TourCodeApiSchema>;
export type UserTourStatusApiResponse = z.infer<typeof UserTourStatusApiSchema>;
export type CompleteTourApiRequest = z.infer<typeof CompleteTourApiRequestSchema>;
