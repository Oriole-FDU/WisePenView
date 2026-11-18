import { useChat } from '@ai-sdk/react';
import { type ChatStatus } from 'ai';
import { useState } from 'react';

import { captureException } from '@/observability';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { WisePenUIMessage } from '../../entity/message';
import { mapUserMessageMetadata } from '../../mapper/chatTurn.mapper';
import type { SendTurnMessageOptions } from '../../service/index.type';
import { PumpChatTransport } from './pumpChatTransport';

const CHAT_STREAM_THROTTLE_MS = 50;

/** History 写入 messages 的窄端口；与 AI SDK setMessages 同形。 */
export type ChatMessagesWriter = (
  messages: WisePenUIMessage[] | ((messages: WisePenUIMessage[]) => WisePenUIMessage[])
) => void;

export interface PumpSendOptions {
  response: Response;
  /**
   * 新 turn：query + 发送选项 → 泵内组乐观 user 气泡（含附件快照 metadata）；
   * recover 等无用户句时可省略。
   */
  turn?: {
    query: string;
    options?: SendTurnMessageOptions;
  };
}

export interface PumpResumeOptions {
  response: Response;
}

export interface UseChatMessageOptions {
  onError?: (error: Error) => void;
}

export interface UseChatMessageResult {
  messages: WisePenUIMessage[];
  status: ChatStatus;
  setMessages: ChatMessagesWriter;
  pumpSend: (options: PumpSendOptions) => Promise<void>;
  pumpResume: (options: PumpResumeOptions) => Promise<void>;
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

export function useChatMessage({ onError }: UseChatMessageOptions = {}): UseChatMessageResult {
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

  const pumpSend = async ({ response, turn }: PumpSendOptions): Promise<void> => {
    transport.armSend(requireSseBody(response, 'pumpSend'));
    if (turn) {
      await chat.sendMessage({
        text: turn.query,
        metadata: mapUserMessageMetadata(turn.options),
      });
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
