import { executeSseApiContract } from '@/apis/executeSseApiContract';

import {
  ChatCompletionStreamApiContract,
  ChatReconnectStreamApiContract,
  ChatRecoverStreamApiContract,
} from './ChatStreamApi.contract';
import type {
  ChatCompletionApiRequest,
  ChatRecoverApiRequest,
  ChatStreamReconnectApiRequest,
} from './ChatStreamApi.schema';

export const streamChatCompletion = (
  request: ChatCompletionApiRequest,
  signal?: AbortSignal
): Promise<Response> => executeSseApiContract(ChatCompletionStreamApiContract, request, { signal });

export const streamChatRecovery = (
  request: ChatRecoverApiRequest,
  signal?: AbortSignal
): Promise<Response> => executeSseApiContract(ChatRecoverStreamApiContract, request, { signal });

export const reconnectChatStream = (
  request: ChatStreamReconnectApiRequest,
  signal?: AbortSignal
): Promise<Response> => executeSseApiContract(ChatReconnectStreamApiContract, request, { signal });
