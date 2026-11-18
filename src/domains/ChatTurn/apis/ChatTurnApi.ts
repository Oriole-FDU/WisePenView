import { executeApiContract } from '@/apis/executeApiContract';
import { executeSseApiContract } from '@/apis/executeSseApiContract';

import {
  CancelChatTurnApiContract,
  ChatCompletionStreamApiContract,
  ChatReconnectStreamApiContract,
  ChatRecoverStreamApiContract,
  ChatRespondApiContract,
  GetActiveChatTurnApiContract,
  ListHistoryMessagesApiContract,
} from './ChatTurnApi.contract';
import type {
  ActiveChatTurnApiRequest,
  ActiveChatTurnApiResponse,
  CancelChatTurnApiRequest,
  ChatCompletionApiRequest,
  ChatRecoverApiRequest,
  ChatRespondApiRequest,
  ChatStreamReconnectApiRequest,
  ListHistoryMessagesApiRequest,
  ListHistoryMessagesApiResponse,
} from './ChatTurnApi.schema';

function getActiveTurn(request: ActiveChatTurnApiRequest): Promise<ActiveChatTurnApiResponse> {
  return executeApiContract(GetActiveChatTurnApiContract, request);
}

async function cancelTurn(request: CancelChatTurnApiRequest): Promise<void> {
  await executeApiContract(CancelChatTurnApiContract, request);
}

async function respondTurn(request: ChatRespondApiRequest): Promise<void> {
  await executeApiContract(ChatRespondApiContract, request);
}

function streamChatCompletion(
  request: ChatCompletionApiRequest,
  signal?: AbortSignal
): Promise<Response> {
  return executeSseApiContract(ChatCompletionStreamApiContract, request, { signal });
}

function streamChatRecovery(
  request: ChatRecoverApiRequest,
  signal?: AbortSignal
): Promise<Response> {
  return executeSseApiContract(ChatRecoverStreamApiContract, request, { signal });
}

function reconnectChatStream(
  request: ChatStreamReconnectApiRequest,
  signal?: AbortSignal
): Promise<Response> {
  return executeSseApiContract(ChatReconnectStreamApiContract, request, { signal });
}

function listHistoryMessages(
  request: ListHistoryMessagesApiRequest
): Promise<ListHistoryMessagesApiResponse> {
  return executeApiContract(ListHistoryMessagesApiContract, request);
}

export const ChatTurnApi = {
  cancelTurn,
  getActiveTurn,
  listHistoryMessages,
  reconnectChatStream,
  respondTurn,
  streamChatCompletion,
  streamChatRecovery,
};
