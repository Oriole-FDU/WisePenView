import { useChat } from '@ai-sdk/react';
import { type ChatStatus, DefaultChatTransport } from 'ai';
import { useMemo } from 'react';

import { useChatTurnService } from '@/domains';
import type { WisePenUIMessage } from '@/domains/ChatSession';
import { captureException } from '@/observability';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatRecoverApiRequest } from '../../apis/ChatTurnApi.schema';
import type { IChatTurnService } from '../../service/index.type';

const CHAT_STREAM_THROTTLE_MS = 50;

/** History 写入 messages 的窄端口；与 AI SDK setMessages 同形。 */
export type ChatMessagesWriter = (
  messages: WisePenUIMessage[] | ((messages: WisePenUIMessage[]) => WisePenUIMessage[])
) => void;

export interface UseChatMessageOptions {
  onError?: (error: Error) => void;
}

export interface UseChatMessageResult {
  messages: WisePenUIMessage[];
  status: ChatStatus;
  /** 供 History 写入；不经 Runtime 组装根外泄到 Controller / UI。 */
  setMessages: ChatMessagesWriter;
  sendMessage: ReturnType<typeof useChat<WisePenUIMessage>>['sendMessage'];
  resumeStream: ReturnType<typeof useChat<WisePenUIMessage>>['resumeStream'];
  stop: ReturnType<typeof useChat<WisePenUIMessage>>['stop'];
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

const createChatTransport = (fetchChatCompletion: IChatTurnService['fetchChatCompletion']) =>
  new DefaultChatTransport<WisePenUIMessage>({
    api: '/chat/completions',
    fetch: fetchChatCompletion,
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

/**
 * 唯一 useChat / Chat 实例与 messages 权威源。
 *
 * Runtime 组装时把 setMessages 注入 History；流式读写与历史写入落同一份列表。
 */
export function useChatMessage({ onError }: UseChatMessageOptions = {}): UseChatMessageResult {
  const chatTurnService = useChatTurnService();

  /**
   * @wisepen-manual-memo
   * 为什么：DefaultChatTransport 会持有底层 fetch，重复创建会让 useChat 误判传输实例变化。
   * 收益：仅在服务传输函数变化时重建，稳定聊天会话与重连逻辑。
   * 失效条件：fetchChatCompletion 引用变化。
   */
  const chatTransport = useMemo(
    () => createChatTransport(chatTurnService.fetchChatCompletion),
    [chatTurnService.fetchChatCompletion]
  );

  const chat = useChat<WisePenUIMessage>({
    experimental_throttle: CHAT_STREAM_THROTTLE_MS,
    onError: (error) => {
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.stream',
      });
      onError?.(error);
    },
    transport: chatTransport,
  });

  return {
    messages: chat.messages,
    status: chat.status,
    setMessages: chat.setMessages,
    sendMessage: chat.sendMessage,
    resumeStream: chat.resumeStream,
    stop: chat.stop,
  };
}
