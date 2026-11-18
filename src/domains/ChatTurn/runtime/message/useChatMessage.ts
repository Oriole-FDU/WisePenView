import { useChat } from '@ai-sdk/react';
import { type ChatStatus } from 'ai';
import { useState } from 'react';

import type { ChatMessageMetadata, WisePenUIMessage } from '@/domains/ChatSession';
import { captureException } from '@/observability';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { PumpChatTransport } from './pumpChatTransport';

const CHAT_STREAM_THROTTLE_MS = 50;

/** History 写入 messages 的窄端口；与 AI SDK setMessages 同形。 */
export type ChatMessagesWriter = (
  messages: WisePenUIMessage[] | ((messages: WisePenUIMessage[]) => WisePenUIMessage[])
) => void;

export interface PumpUserMessage {
  text: string;
  metadata?: ChatMessageMetadata;
}

export interface PumpSendOptions {
  response: Response;
  /** 新 turn 时插入本地 user 气泡；recover 等无用户句时可省略。 */
  userMessage?: PumpUserMessage;
}

export interface PumpResumeOptions {
  response: Response;
}

export interface UseChatMessageOptions {
  onError?: (error: Error) => void;
}

export interface UseChatMessageResult {
  messages: WisePenUIMessage[];
  /** 过渡期保留；业务续跑真源应为 Runtime connect FSM，不得作为协议分支依据。 */
  status: ChatStatus;
  /** 供 History 写入；不经 Runtime 组装根外泄到 Controller / UI。 */
  setMessages: ChatMessagesWriter;
  /** 将 Service 已取得的 SSE 泵入 messages（completions / recover）。 */
  pumpSend: (options: PumpSendOptions) => Promise<void>;
  /** 将 Service 已取得的 SSE 泵入 messages（reconnect / stream 订阅）。 */
  pumpResume: (options: PumpResumeOptions) => Promise<void>;
  /** 仅中止本地读流，不等于后端 cancel。 */
  stop: () => void;
}

function requireSseBody(response: Response, operation: string): ReadableStream<Uint8Array> {
  if (!response.body) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `${operation} 响应缺少 SSE body`,
    });
  }
  return response.body;
}

/**
 * 唯一 useChat 实例与 messages 权威源；对外只暴露泵与数据面。
 *
 * 协议 HTTP 由 Service 完成后再 pump；不外泄 sendMessage / resumeStream。
 */
export function useChatMessage({ onError }: UseChatMessageOptions = {}): UseChatMessageResult {
  // 跨渲染保持同一 PumpChatTransport，供 arm 与 useChat 共享，避免 Chat 会话重建。
  const [transport] = useState(() => new PumpChatTransport<WisePenUIMessage>());

  const chat = useChat<WisePenUIMessage>({
    experimental_throttle: CHAT_STREAM_THROTTLE_MS,
    onError: (error) => {
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.stream',
      });
      onError?.(error);
    },
    transport,
  });

  const pumpSend = async ({ response, userMessage }: PumpSendOptions): Promise<void> => {
    transport.armSend(requireSseBody(response, 'pumpSend'));
    if (userMessage) {
      await chat.sendMessage({ text: userMessage.text, metadata: userMessage.metadata });
      return;
    }
    await chat.sendMessage(undefined);
  };

  const pumpResume = async ({ response }: PumpResumeOptions): Promise<void> => {
    transport.armReconnect(requireSseBody(response, 'pumpResume'));
    await chat.resumeStream();
  };

  return {
    messages: chat.messages,
    status: chat.status,
    setMessages: chat.setMessages,
    pumpSend,
    pumpResume,
    stop: () => {
      void chat.stop();
    },
  };
}
