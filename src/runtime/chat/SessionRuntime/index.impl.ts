import { Chat } from '@ai-sdk/react';
import {
  type ChatTransport,
  isToolUIPart,
  parseJsonEventStream,
  type UIMessageChunk,
  uiMessageChunkSchema,
} from 'ai';

import { getChatTurnService } from '@/domains';
import type { ChatMessageMetadata, WisePenUIMessage } from '@/domains/ChatSession';
import type { ChatRecoverApiRequest } from '@/domains/ChatTurn/apis/ChatTurnApi.schema';
import {
  pickChatCompletionApiRequest,
  pickChatRecoverApiRequest,
} from '@/domains/ChatTurn/apis/ChatTurnApi.schema';
import { mapChatTurnRequest } from '@/domains/ChatTurn/mapper/chatTurn.mapper';
import { normalizeChatSseResponse } from '@/domains/ChatTurn/runtime/chatSseNormalizer';
import type { IChatTurnService } from '@/domains/ChatTurn/service/index.type';
import { captureException } from '@/observability';
import type { ExceptionOperation } from '@/observability/types';
import {
  createClientError,
  FRONTEND_CLIENT_ERROR,
  isWisePenError,
  type WisePenError,
} from '@/utils/error';

import type {
  SessionApprovalDecision,
  SessionBootstrapKind,
  SessionPhase,
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
        this.reportError(error, 'SessionRuntime 流错误', 'chat.stream');
      },
      onFinish: ({ isAbort, isError, messages }) => {
        if (this.cleaned || isError) return;
        if (isAbort) {
          if (isInFlightPhase(this.state.phase)) {
            this.updateState({ phase: 'idle', error: undefined });
          }
          return;
        }
        this.updateState({
          phase: hasPendingToolApproval(messages) ? 'hanged' : 'idle',
          error: undefined,
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
        this.updateState({
          phase: 'idle',
          historyPage: 1,
          historyTotalPage: 1,
          historyLoadingMore: false,
        });
        return;
      }

      const history = await this.chatTurnService.listHistoryMessages(
        this.state.sessionId,
        1,
        HISTORY_PAGE_SIZE
      );
      this.assertAlive();
      this.chat.messages = history.list;
      this.updateState({
        historyPage: history.page ?? 1,
        historyTotalPage: history.totalPage ?? 1,
        historyLoadingMore: false,
      });

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

  async send(query: string, options?: SessionSendOptions): Promise<void> {
    this.assertAlive();
    if (this.state.phase !== 'idle' && this.state.phase !== 'error') {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `当前 phase=${this.state.phase}，不能 send`,
      });
    }

    this.updateState({ phase: 'sending', error: undefined });
    try {
      const requestBody = mapChatTurnRequest({
        defaultSessionId: this.state.sessionId,
        query,
        options,
      });
      const metadata = buildSendMessageMetadata(options);
      await this.chat.sendMessage({ text: query, metadata }, { body: requestBody });
      this.assertAlive();
    } catch (error) {
      if (this.cleaned) return;
      throw this.reportError(error, 'SessionRuntime send 失败', 'chat.send');
    }
  }

  async cancel(): Promise<void> {
    this.assertAlive();
    if (this.state.phase !== 'streaming' && this.state.phase !== 'sending') return;

    this.updateState({ phase: 'canceling' });
    this.chat.stop();
    try {
      await this.chatTurnService.cancelTurn(this.state.sessionId);
      this.assertAlive();
      // stop/onFinish 可能已收口；仅当仍停在 canceling 时再落到 idle
      if (this.getSnapshot().phase === 'canceling') {
        this.updateState({ phase: 'idle', error: undefined });
      }
    } catch (error) {
      if (this.cleaned) return;
      throw this.reportError(error, 'SessionRuntime cancel 失败', 'chat.cancel');
    }
  }

  async approve(decisions: SessionApprovalDecision[]): Promise<void> {
    this.assertAlive();
    if (this.state.phase !== 'hanged') {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `当前 phase=${this.state.phase}，不能 approve`,
      });
    }

    const requestBody: ChatRecoverApiRequest = {
      session_id: this.state.sessionId,
      client_tool_results: [],
      tool_approval_status: decisions.map((decision) => ({
        tool_call_id: decision.toolCallId,
        approved: decision.approved,
      })),
    };

    this.updateState({ phase: 'streaming', error: undefined });
    try {
      await this.chat.sendMessage(undefined, { body: requestBody });
      this.assertAlive();
    } catch (error) {
      if (this.cleaned) return;
      throw this.reportError(error, 'SessionRuntime approve 失败', 'chat.recover');
    }
  }

  async loadMoreHistory(): Promise<void> {
    this.assertAlive();
    if (this.state.historyLoadingMore || this.state.historyPage >= this.state.historyTotalPage) {
      return;
    }

    const nextPage = this.state.historyPage + 1;
    this.updateState({ historyLoadingMore: true });
    try {
      const history = await this.chatTurnService.listHistoryMessages(
        this.state.sessionId,
        nextPage,
        HISTORY_PAGE_SIZE
      );
      this.assertAlive();
      this.chat.messages = mergeMessages(history.list, this.chat.messages);
      this.updateState({
        historyPage: history.page ?? nextPage,
        historyTotalPage: history.totalPage ?? this.state.historyTotalPage,
        historyLoadingMore: false,
      });
    } catch (error) {
      if (this.cleaned) return;
      this.updateState({ historyLoadingMore: false });
      throw this.reportError(error, 'SessionRuntime 加载更多历史失败', 'chat.bootstrap');
    }
  }

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

    if (!this.cleaned && this.state.phase === 'sending') {
      this.updateState({ phase: 'streaming' });
    }

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

  private reportError(error: unknown, reason: string, operation: ExceptionOperation): WisePenError {
    const convertedError = toWisePenError(error, reason);
    captureException(convertedError, {
      detector: 'application-handled',
      operation,
    });
    this.updateState({
      phase: 'error',
      error: convertedError,
    });
    return convertedError;
  }

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

function mergeMessages(
  olderMessages: readonly WisePenUIMessage[],
  newerMessages: readonly WisePenUIMessage[]
): WisePenUIMessage[] {
  const seenIds = new Set<string>();
  return [...olderMessages, ...newerMessages].filter((message) => {
    if (seenIds.has(message.id)) return false;
    seenIds.add(message.id);
    return true;
  });
}

function isInFlightPhase(phase: SessionPhase): boolean {
  return phase === 'sending' || phase === 'streaming' || phase === 'canceling';
}

function hasPendingToolApproval(messages: readonly WisePenUIMessage[]): boolean {
  for (const message of messages) {
    for (const part of message.parts) {
      if (isToolUIPart(part) && part.state === 'approval-requested') return true;
    }
  }
  return false;
}

function buildSendMessageMetadata(options?: SessionSendOptions): ChatMessageMetadata {
  const uploadedAttachmentSnapshots = (options?.uploadedAttachments ?? [])
    .filter((attachment) => attachment.enabled)
    .map((attachment) => ({
      attachmentId: attachment.attachmentId,
      filename: attachment.filename,
      kind: 'temporary' as const,
      available: true,
    }));
  const resourceAttachmentSnapshots = (options?.selectedResources ?? [])
    .filter((resource) => resource.enabled)
    .map((resource) => ({
      attachmentId: resource.resourceId,
      filename: resource.resourceName,
      kind: 'resource' as const,
      available: true,
    }));
  const selectedAttachments = [...resourceAttachmentSnapshots, ...uploadedAttachmentSnapshots];

  return {
    createdAt: new Date().toISOString(),
    ...(selectedAttachments.length > 0 ? { selectedAttachments } : {}),
  };
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
    new TransformStream({
      transform(chunk, controller) {
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
