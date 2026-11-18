import { ChatTurnApi } from '@domain-apis';

import { buildApiUrl } from '@/apis/buildApiUrl';

import type { ChatCompletionApiRequest, ChatRecoverApiRequest } from '../apis/ChatTurnApi.schema';
import {
  pickChatCompletionApiRequest,
  pickChatRecoverApiRequest,
} from '../apis/ChatTurnApi.schema';
import {
  mapListHistoryMessagesFromApi,
  mapListHistoryMessagesRequest,
} from '../mapper/chatHistory.mapper';
import { normalizeChatSseResponse } from '../runtime/chatSseNormalizer';
import type { IChatTurnService } from './index.type';

const streamChatCompletion = (
  request: ChatCompletionApiRequest,
  signal?: AbortSignal
): Promise<Response> => ChatTurnApi.streamChatCompletion(request, signal);

const recoverChatStream = (
  request: ChatRecoverApiRequest,
  signal?: AbortSignal
): Promise<Response> => ChatTurnApi.streamChatRecovery(request, signal);

const reconnectChatStream = (sessionId: string, signal?: AbortSignal): Promise<Response> =>
  ChatTurnApi.reconnectChatStream({ session_id: sessionId }, signal);

function resolveChatApiUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' || input instanceof URL
    ? new URL(input.toString(), buildApiUrl('/')).toString()
    : input.url;
}

async function fetchChatCompletion(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const requestUrl = new URL(resolveChatApiUrl(input));
  const rawBody = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
  const signal = init?.signal ?? undefined;

  const response = requestUrl.pathname.endsWith('/chat/completions/recover')
    ? await recoverChatStream(pickChatRecoverApiRequest(rawBody), signal)
    : requestUrl.pathname.endsWith('/chat/completions/stream')
      ? await reconnectChatStream(requestUrl.searchParams.get('session_id') ?? '', signal)
      : await streamChatCompletion(pickChatCompletionApiRequest(rawBody), signal);

  return normalizeChatSseResponse(response);
}

const getActiveTurnId = async (sessionId: string): Promise<string | null> =>
  (await ChatTurnApi.getActiveTurn({ session_id: sessionId })).turn_id;

const cancelTurn = async (sessionId: string): Promise<void> => {
  await ChatTurnApi.cancelTurn({ session_id: sessionId });
};

const listHistoryMessages = async (sessionId: string, page: number, size: number) =>
  mapListHistoryMessagesFromApi(
    await ChatTurnApi.listHistoryMessages(mapListHistoryMessagesRequest({ sessionId, page, size }))
  );

export const createChatTurnServices = (): IChatTurnService => ({
  streamChatCompletion,
  recoverChatStream,
  reconnectChatStream,
  fetchChatCompletion,
  getActiveTurnId,
  cancelTurn,
  listHistoryMessages,
});
