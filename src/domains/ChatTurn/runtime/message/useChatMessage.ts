/**
 * 持有 AI SDK 消息列表，并向外提供 send / resume 泵入口。
 */
import { useChat } from '@ai-sdk/react';
import { type ChatStatus } from 'ai';
import { useState } from 'react';

import { captureException } from '@/observability';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import {
  ChatMessageMetadataSchema,
  ToolApprovalRequestDataSchema,
  type WisePenUIMessage,
} from '../../entity/message';
import { mapUserMessageMetadata } from '../../mapper/chatTurn.mapper';
import type { SendTurnMessageOptions } from '../../service/index.type';
import { PumpChatTransport } from './pumpChatTransport';

const CHAT_STREAM_THROTTLE_MS = 50;

// AI SDK 类型使用裸键，当前运行时按完整的 data-* chunk 类型查表，两处都提供。
const runtimeDataPartSchemas = {
  'tool-approval-request': ToolApprovalRequestDataSchema,
  'data-tool-approval-request': ToolApprovalRequestDataSchema,
};

export type ChatMessagesWriter = (
  messages: WisePenUIMessage[] | ((messages: WisePenUIMessage[]) => WisePenUIMessage[])
) => void;

export interface PumpSendOptions {
  response: Response;
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
    messageMetadataSchema: ChatMessageMetadataSchema,
    dataPartSchemas: runtimeDataPartSchemas,
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
