import { z } from 'zod';

import { IsoDateTimeSchema, NonEmptyStringSchema } from '@/apis/schema';

export const IssueRecognitionCredentialApiRequestSchema = z.strictObject({
  provider: z.literal('IFLYTEK'),
  options: z.strictObject({
    eos_ms: z.number().int().min(1000).max(10000).optional(),
  }),
});

export const IssueRecognitionCredentialApiResponseSchema = z.object({
  provider: z.literal('IFLYTEK'),
  expires_at: IsoDateTimeSchema,
  credential: z.object({
    url: z.url(),
    common: z.object({
      app_id: NonEmptyStringSchema,
    }),
  }),
});

export type IssueRecognitionCredentialApiRequest = z.infer<
  typeof IssueRecognitionCredentialApiRequestSchema
>;
export type IssueRecognitionCredentialApiResponse = z.infer<
  typeof IssueRecognitionCredentialApiResponseSchema
>;
