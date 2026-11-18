import { z } from 'zod';

import { defineApiContract } from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  ActiveChatTurnApiRequestSchema,
  ActiveChatTurnApiResponseSchema,
  CancelChatTurnApiRequestSchema,
  ChatCompletionApiRequestSchema,
  ChatRecoverApiRequestSchema,
  ChatRespondApiRequestSchema,
  ChatStreamReconnectApiRequestSchema,
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

export const ChatRespondApiContract = defineApiContract({
  name: 'ChatRespondApi',
  method: 'POST',
  endpoint: '/chat/completions/respond',
  requestPlacement: 'body',
  transport: 'json',
  request: ChatRespondApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ChatCompletionStreamApiContract = defineApiContract({
  name: 'ChatCompletionStreamApi',
  method: 'POST',
  endpoint: '/chat/completions',
  requestPlacement: 'body',
  transport: 'sse',
  request: ChatCompletionApiRequestSchema,
  response: z.string(),
});

export const ChatRecoverStreamApiContract = defineApiContract({
  name: 'ChatRecoverStreamApi',
  method: 'POST',
  endpoint: '/chat/completions/recover',
  requestPlacement: 'body',
  transport: 'sse',
  request: ChatRecoverApiRequestSchema,
  response: z.string(),
});

export const ChatReconnectStreamApiContract = defineApiContract({
  name: 'ChatReconnectStreamApi',
  method: 'GET',
  endpoint: '/chat/completions/stream',
  requestPlacement: 'query',
  transport: 'sse',
  request: ChatStreamReconnectApiRequestSchema,
  response: z.string(),
});
