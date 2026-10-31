import { z } from 'zod';

import { defineApiContract } from '@/apis/contract';

import {
  ChatCompletionApiRequestSchema,
  ChatRecoverApiRequestSchema,
  ChatStreamReconnectApiRequestSchema,
} from './ChatStreamApi.schema';

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
