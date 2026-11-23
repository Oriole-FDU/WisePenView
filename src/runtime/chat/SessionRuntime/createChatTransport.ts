import { DefaultChatTransport } from 'ai';

import { buildApiUrl } from '@/apis/buildApiUrl';
import type { WisePenUIMessage } from '@/domains/ChatSession';
import type { ChatRecoverApiRequest } from '@/domains/ChatTurn/apis/ChatTurnApi.schema';
import {
  pickChatCompletionApiRequest,
  pickChatRecoverApiRequest,
} from '@/domains/ChatTurn/apis/ChatTurnApi.schema';
import { normalizeChatSseResponse } from '@/domains/ChatTurn/runtime/chatSseNormalizer';
import type { IChatTurnService } from '@/domains/ChatTurn/service/index.type';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

type ChatStreamApi = Pick<
  IChatTurnService,
  'streamChatCompletion' | 'recoverChatStream' | 'reconnectChatStream'
>;

function resolveChatApiUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' || input instanceof URL
    ? new URL(input.toString(), buildApiUrl('/')).toString()
    : input.url;
}

function isChatRecoverRequest(
  body: Record<string, unknown> | undefined
): body is ChatRecoverApiRequest {
  return (
    typeof body?.session_id === 'string' &&
    Array.isArray(body.client_tool_results) &&
    Array.isArray(body.tool_approval_status)
  );
}

async function fetchChatCompletion(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  streamApi: ChatStreamApi
): Promise<Response> {
  const requestUrl = new URL(resolveChatApiUrl(input));
  const rawBody = typeof init?.body === 'string' ? JSON.parse(init.body) : {};

  const response = requestUrl.pathname.endsWith('/chat/completions/recover')
    ? await streamApi.recoverChatStream(
        pickChatRecoverApiRequest(rawBody),
        init?.signal ?? undefined
      )
    : requestUrl.pathname.endsWith('/chat/completions/stream')
      ? await streamApi.reconnectChatStream(
          requestUrl.searchParams.get('session_id') ?? '',
          init?.signal ?? undefined
        )
      : await streamApi.streamChatCompletion(
          pickChatCompletionApiRequest(rawBody),
          init?.signal ?? undefined
        );

  return normalizeChatSseResponse(response);
}

export function createChatTransport(streamApi: ChatStreamApi) {
  return new DefaultChatTransport<WisePenUIMessage>({
    api: '/chat/completions',
    fetch: (input, init) => fetchChatCompletion(input, init, streamApi),
    prepareSendMessagesRequest: ({ body }) => {
      if (isChatRecoverRequest(body)) {
        return { api: '/chat/completions/recover', body };
      }
      return { body: body ?? {} };
    },
    prepareReconnectToStreamRequest: ({ body }) => {
      const sessionId = body?.session_id;
      if (typeof sessionId !== 'string' || sessionId === '') {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: '重连聊天流时缺少 session_id',
        });
      }
      const params = new URLSearchParams({ session_id: sessionId });
      return { api: `/chat/completions/stream?${params.toString()}` };
    },
  });
}
