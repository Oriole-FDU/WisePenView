import { z } from 'zod';

import { OpaqueIdSchema } from '@/apis/schema';

export const ActiveChatTurnApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
});

export const ActiveChatTurnApiResponseSchema = z.object({
  turn_id: OpaqueIdSchema.nullable(),
});

export const CancelChatTurnApiRequestSchema = z.strictObject({
  session_id: OpaqueIdSchema,
});

export type ActiveChatTurnApiRequest = z.infer<typeof ActiveChatTurnApiRequestSchema>;
export type ActiveChatTurnApiResponse = z.infer<typeof ActiveChatTurnApiResponseSchema>;
export type CancelChatTurnApiRequest = z.infer<typeof CancelChatTurnApiRequestSchema>;
