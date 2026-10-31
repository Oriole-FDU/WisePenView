import { z } from 'zod';

import { NonBlankStringSchema, NullableStringSchema } from '@/apis/schema';

export const InitiateEmailVerifyApiRequestSchema = z.strictObject({
  email: z.email(),
});

export const CheckEmailVerifyApiRequestSchema = z.strictObject({
  token: NonBlankStringSchema,
});

export const InitiateFudanUISVerifyApiRequestSchema = z.strictObject({
  uisAccount: NonBlankStringSchema,
  uisPassword: NonBlankStringSchema,
});

export const CheckFudanUISVerifyApiResponseSchema = z.object({
  completed: z.boolean(),
  requireAction: z.boolean(),
  actionPayload: NullableStringSchema,
  message: NullableStringSchema,
});

export type InitiateEmailVerifyApiRequest = z.infer<typeof InitiateEmailVerifyApiRequestSchema>;
export type CheckEmailVerifyApiRequest = z.infer<typeof CheckEmailVerifyApiRequestSchema>;
export type InitiateFudanUISVerifyApiRequest = z.infer<
  typeof InitiateFudanUISVerifyApiRequestSchema
>;
export type CheckFudanUISVerifyApiResponse = z.infer<typeof CheckFudanUISVerifyApiResponseSchema>;
