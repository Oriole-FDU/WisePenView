import { parseJsonEventStream, type ParseResult } from '@ai-sdk/provider-utils';
import { Chat } from '@ai-sdk/react';
import { type ChatTransport, type UIMessageChunk, uiMessageChunkSchema } from 'ai';

import { getChatTurnService } from '@/domains';
import type { WisePenUIMessage } from '@/domains/ChatSession';
import type { ChatRecoverApiRequest } from '@/domains/ChatTurn/apis/ChatTurnApi.schema';
import {
  pickChatCompletionApiRequest,
  pickChatRecoverApiRequest,
} from '@/domains/ChatTurn/apis/ChatTurnApi.schema';
import { normalizeChatSseResponse } from '@/domains/ChatTurn/runtime/chatSseNormalizer';
import type { IChatTurnService } from '@/domains/ChatTurn/service/index.type';
import { captureException } from '@/observability';
import {
  createClientError,
  FRONTEND_CLIENT_ERROR,
  isWisePenError,
  type WisePenError,
} from '@/utils/error';

import type {
  SessionApprovalDecision,
  SessionBootstrapKind,
  SessionSendOptions,
  SessionVisibility,
} from '../_common';
import {
  type SessionRuntimeSnapshot,
  SessionRuntimeState,
  type SessionRuntimeStateUpdate,
} from '../model/SessionRuntimeState';
import type { SessionRuntime as SessionRuntimeContract } from './index.type';

const HISTORY_PAGE_SIZE = 100;

type ChatSendMessagesOptions = Parameters<ChatTransport<WisePenUIMessage>['sendMessages']>[0];
type ChatReconnectToStreamOptions = Parameters<
  ChatTransport<WisePenUIMessage>['reconnectToStream']
>[0];

export class SessionRuntime implements SessionRuntimeContract {
  readonly chat: Chat<WisePenUIMessage>;

  private readonly state: SessionRuntimeState;
  private readonly chatTurnService: IChatTurnService;

  private cleaned = false;
  private readonly listeners = new Set<(state: SessionRuntimeSnapshot) => void>();

  constructor(sessionId: string) {
    this.state = new SessionRuntimeState(sessionId);
    this.chatTurnService = getChatTurnService();
    this.chat = new Chat<WisePenUIMessage>({
      id: sessionId,
      transport: {
        sendMessages: (options) => this.sendMessages(options),
        reconnectToStream: (options) => this.reconnectToStream(options),
      },
      onError: (error) => {
        if (this.cleaned) return;
        const convertedError = toWisePenError(error, 'SessionRuntime 流错误');
        captureException(convertedError, {
          detector: 'application-handled',
          operation: 'chat.stream',
        });
        this.updateState({
          phase: 'error',
          error: convertedError,
        });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 接口方法
  // ---------------------------------------------------------------------------

  getSnapshot(): SessionRuntimeSnapshot {
    return this.state.snapshot();
  }

  subscribe(listener: (state: SessionRuntimeSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async bootstrap(kind: SessionBootstrapKind): Promise<void> {
    this.assertAlive();
    try {
      if (kind === 'createSession') {
        this.updateState({ phase: 'idle' });
        return;
      }

      const history = await this.chatTurnService.listHistoryMessages(
        this.state.sessionId,
        1,
        HISTORY_PAGE_SIZE
      );
      this.assertAlive();
      this.chat.messages = history.list;

      const activeTurnId = await this.chatTurnService.getActiveTurnId(this.state.sessionId);
      this.assertAlive();

      if (activeTurnId) {
        this.updateState({ phase: 'streaming' });
        await this.chat.resumeStream({ body: { session_id: this.state.sessionId } });
        this.assertAlive();
        return;
      }

      this.updateState({ phase: 'idle' });
    } catch (error) {
      if (this.cleaned) return;
      const convertedError = toWisePenError(error, 'SessionRuntime bootstrap 失败');
      captureException(convertedError, {
        detector: 'application-handled',
        operation: 'chat.bootstrap',
      });
      this.updateState({
        phase: 'error',
        error: convertedError,
      });
      throw convertedError;
    }
  }

  setVisibility(visibility: SessionVisibility): void {
    this.assertAlive();
    if (this.state.visibility === visibility) return;
    this.updateState({ visibility });
  }

  async cleanup(): Promise<void> {
    if (this.cleaned) return;
    this.cleaned = true;
    this.listeners.clear();
    this.chat.stop();
  }

  async send(_query: string, _options?: SessionSendOptions): Promise<void> {}

  async cancel(): Promise<void> {}

  async approve(_decisions: SessionApprovalDecision[]): Promise<void> {}

  // ---------------------------------------------------------------------------
  // Chat transport（替换 Chat 底层 I/O）
  // ---------------------------------------------------------------------------

  private async sendMessages({
    body,
    abortSignal,
  }: ChatSendMessagesOptions): Promise<ReadableStream<UIMessageChunk>> {
    // AI SDK 将 body 标成 object；此处收窄为可索引记录再分流
    const requestBody = (body ?? {}) as Record<string, unknown>;
    const response = isChatRecoverRequest(requestBody)
      ? await this.chatTurnService.recoverChatStream(
          pickChatRecoverApiRequest(requestBody),
          abortSignal ?? undefined
        )
      : await this.chatTurnService.streamChatCompletion(
          pickChatCompletionApiRequest(requestBody),
          abortSignal ?? undefined
        );
    return toUiMessageChunkStream(response);
  }

  private async reconnectToStream({
    body,
  }: ChatReconnectToStreamOptions): Promise<ReadableStream<UIMessageChunk> | null> {
    const sessionId = (body as Record<string, unknown> | undefined)?.session_id;
    if (typeof sessionId !== 'string' || sessionId === '') {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: '重连聊天流时缺少 session_id',
      });
    }

    const response = await this.chatTurnService.reconnectChatStream(sessionId);
    if (response.status === 204) return null;
    return toUiMessageChunkStream(response);
  }

  // ---------------------------------------------------------------------------
  // 私有方法
  // ---------------------------------------------------------------------------

  private updateState(update: SessionRuntimeStateUpdate): void {
    this.state.update(update);
    const snapshot = this.state.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private assertAlive(): void {
    if (!this.cleaned) return;
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'SessionRuntime 已 cleanup',
    });
  }
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

function toUiMessageChunkStream(response: Response): ReadableStream<UIMessageChunk> {
  const normalized = normalizeChatSseResponse(response);
  if (!normalized.body) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: '聊天流响应体为空',
    });
  }

  return parseJsonEventStream({
    stream: normalized.body,
    schema: uiMessageChunkSchema,
  }).pipeThrough(
    new TransformStream<ParseResult<UIMessageChunk>, UIMessageChunk>({
      async transform(chunk, controller) {
        if (!chunk.success) throw chunk.error;
        controller.enqueue(chunk.value);
      },
    })
  );
}

function toWisePenError(error: unknown, reason: string): WisePenError {
  if (isWisePenError(error)) return error;
  return createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, { reason }, error);
}
