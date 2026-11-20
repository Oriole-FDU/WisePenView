/**
 * 持有 AI SDK Chat 与 Pump，提供按次装配的 send / resume 入口。
 */
import { Chat } from '@ai-sdk/react';
import type { ChatStatus } from 'ai';

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

export interface ChatMessageOptions {
  onError?: (error: Error) => void;
  onChange?: () => void;
}

function requireSseBody(response: Response, operation: string): ReadableStream<Uint8Array> {
  if (!response.body) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `${operation} 响应缺少 SSE body`,
    });
  }
  return response.body;
}

export class ChatMessage {
  readonly chat: Chat<WisePenUIMessage>;
  private readonly transport = new PumpChatTransport<WisePenUIMessage>();
  private readonly unsubscribers: Array<() => void> = [];

  constructor(options: ChatMessageOptions = {}) {
    this.chat = new Chat<WisePenUIMessage>({
      onError: (error) => {
        captureException(error, {
          detector: 'application-handled',
          operation: 'chat.stream',
        });
        options.onError?.(error);
      },
      messageMetadataSchema: ChatMessageMetadataSchema,
      dataPartSchemas: runtimeDataPartSchemas,
      transport: this.transport,
    });

    if (options.onChange) {
      this.unsubscribers.push(this.chat['~registerMessagesCallback'](options.onChange));
      this.unsubscribers.push(this.chat['~registerStatusCallback'](options.onChange));
      this.unsubscribers.push(this.chat['~registerErrorCallback'](options.onChange));
    }
  }

  get messages(): WisePenUIMessage[] {
    return this.chat.messages;
  }

  get status(): ChatStatus {
    return this.chat.status;
  }

  setMessages: ChatMessagesWriter = (messages) => {
    this.chat.messages = typeof messages === 'function' ? messages(this.chat.messages) : messages;
  };

  async pumpSend({ response, turn }: PumpSendOptions): Promise<void> {
    this.transport.armSend(requireSseBody(response, 'pumpSend'));
    if (turn) {
      await this.chat.sendMessage({
        text: turn.query,
        metadata: mapUserMessageMetadata(turn.options),
      });
      return;
    }
    await this.chat.sendMessage(undefined);
  }

  async pumpResume({ response }: PumpResumeOptions): Promise<void> {
    this.transport.armReconnect(requireSseBody(response, 'pumpResume'));
    await this.chat.resumeStream();
  }

  stop(): void {
    void this.chat.stop();
  }

  dispose(): void {
    this.stop();
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers.length = 0;
  }
}
