import { defineApiContract } from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  ActiveChatTurnApiRequestSchema,
  ActiveChatTurnApiResponseSchema,
  CancelChatTurnApiRequestSchema,
} from './ChatTurnApi.schema';

export const GetActiveChatTurnApiContract = defineApiContract({
  name: 'GetActiveChatTurnApi',
  method: 'GET',
  endpoint: '/chat/completions/active',
  requestPlacement: 'query',
  transport: 'json',
  request: ActiveChatTurnApiRequestSchema,
  response: ActiveChatTurnApiResponseSchema,
});

export const CancelChatTurnApiContract = defineApiContract({
  name: 'CancelChatTurnApi',
  method: 'POST',
  endpoint: '/chat/completions/cancel',
  requestPlacement: 'body',
  transport: 'json',
  request: CancelChatTurnApiRequestSchema,
  response: EmptyApiResponseSchema,
});
