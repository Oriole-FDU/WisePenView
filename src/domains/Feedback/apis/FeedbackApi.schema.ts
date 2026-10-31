import { z } from 'zod';

export const FeedbackTypeApiSchema = z.enum([
  'BUG_REPORT',
  'SUGGESTION',
  'CONSULTATION',
  'COMPLAINT',
  'OTHER',
]);

export const AddFeedbackApiRequestSchema = z.strictObject({
  content: z.string(),
  contact: z.string(),
  imageUrl: z.string().max(1024).optional(),
  browser: z.string().optional(),
  type: FeedbackTypeApiSchema,
});

export type AddFeedbackApiRequest = z.infer<typeof AddFeedbackApiRequestSchema>;
