import { Chat } from '@ai-sdk/react';
import {
  type ChatTransport,
  isToolUIPart,
  parseJsonEventStream,
  type UIMessageChunk,
  uiMessageChunkSchema,
} from 'ai';

import { parseApiErrorBody } from '@/apis/apiError';
import { getChatTurnService } from '@/domains';
import type { ChatMessageMetadata, WisePenUIMessage } from '@/domains/ChatSession';
import type {
  ChatRecoverApiRequest,
  ChatRespondApiRequest,
} from '@/domains/ChatTurn/apis/ChatTurnApi.schema';
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
  FRONTEND_NETWORK_ERROR,
  isWisePenError,
  WisePenError,
} from '@/utils/error';
import { createUuid } from '@/utils/random';
import { isRecord } from '@/utils/type/typeGuards';

import type {
  SessionApprovalDecision,
  SessionBootstrapKind,
  SessionSendOptions,
  SessionVisibility,
} from '../_common';
import type {
  SessionRuntime,
  SessionRuntimeSnapshot,
  SessionRuntimeSnapshotUpdate,
} from './index.type';

const HISTORY_PAGE_SIZE = 100;

type ChatSendMessagesOptions = Parameters<ChatTransport<WisePenUIMessage>['sendMessages']>[0];

export function createSessionRuntime(sessionId: string): SessionRuntime {
  const chatTurnService: IChatTurnService = getChatTurnService();
  const listeners = new Set<() => void>();
  let snapshot: SessionRuntimeSnapshot = {
    sessionId,
    visibility: 'background',
    phase: 'idle',
    error: undefined,
    historyPage: 1,
    historyTotalPage: 1,
    historyLoadingMore: false,
  };
  let cleaned = false;
  let refreshPromise: Promise<void> | null = null;
  let streamTask: Promise<void> | undefined;
  let reconnectAbort: AbortController | undefined;

  const updateState = (update: SessionRuntimeSnapshotUpdate): void => {
    snapshot = { ...snapshot, ...update };
    for (const listener of listeners) listener();
  };

  function reportError(
    error: unknown,
    reason: string,
    operation: ExceptionOperation
  ): WisePenError {
    const convertedError = toWisePenError(error, reason);
    captureException(convertedError, { detector: 'application-handled', operation });
    return convertedError;
  }

  const chat = new Chat<WisePenUIMessage>({
    id: sessionId,
    transport: {
      sendMessages,
      reconnectToStream,
    },
  });

  function assertAlive(): void {
    if (!cleaned) return;
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'SessionRuntime 已 cleanup',
    });
  }

  function settledPhase() {
    if (hasPendingToolApproval(chat.lastMessage)) return 'hanged';
    return chat.status === 'error' ? 'error' : 'idle';
  }

  function startStream(
    phase: 'sending' | 'streaming',
    operation: ExceptionOperation,
    run: () => Promise<void>
  ): Promise<void> {
    const task = Promise.resolve().then(async () => {
      try {
        assertAlive();
        chat.clearError();
        await run();
        if (chat.status === 'error') throw chat.error;
      } catch (cause) {
        if (cleaned) throw cause;
        const error = reportError(cause, '聊天流请求失败', operation);
        if (snapshot.phase !== 'canceling') {
          updateState({
            phase: hasPendingToolApproval(chat.lastMessage) ? 'hanged' : 'error',
            error,
          });
        }
        throw error;
      } finally {
        streamTask = undefined;
        reconnectAbort = undefined;
      }

      if (!cleaned && snapshot.phase !== 'canceling') {
        updateState({ phase: settledPhase(), error: undefined });
      }
    });
    streamTask = task;
    updateState({ phase, error: undefined });
    return task;
  }

  async function refreshSession(): Promise<void> {
    assertAlive();
    const messages = chat.messages;
    try {
      const [history, activeTurnId] = await Promise.all([
        chatTurnService.listHistoryMessages(sessionId, 1, HISTORY_PAGE_SIZE),
        chatTurnService.getActiveTurnId(sessionId),
      ]);
      assertAlive();
      if (streamTask || snapshot.phase === 'canceling' || chat.messages !== messages) {
        return;
      }
      replaceLatestHistory(history);
      if (activeTurnId) {
        void startStream('streaming', 'chat.bootstrap', () => chat.resumeStream()).catch(
          () => undefined
        );
        return;
      }

      updateState({
        phase: hasPendingToolApproval(chat.lastMessage) ? 'hanged' : 'idle',
        error: undefined,
      });
    } catch (error) {
      if (cleaned) return;
      throw reportError(error, '同步会话历史失败', 'chat.bootstrap');
    }
  }

  function replaceLatestHistory(
    history: Awaited<ReturnType<IChatTurnService['listHistoryMessages']>>
  ): void {
    const firstLatestId = history.list[0]?.id;
    const start = chat.messages.findIndex((message) => message.id === firstLatestId);
    // 保留服务端分页边界之前的历史；最新一页覆盖客户端的临时消息。
    chat.messages = start > 0 ? [...chat.messages.slice(0, start), ...history.list] : history.list;
    updateState({
      historyPage: start > 0 ? Math.min(snapshot.historyPage, history.totalPage) : history.page,
      historyTotalPage: history.totalPage,
    });
  }

  async function bootstrap(kind: SessionBootstrapKind): Promise<void> {
    if (kind === 'loadSession') await refresh();
  }

  function refresh(): Promise<void> {
    if (refreshPromise) return refreshPromise;
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  function getSnapshot(): SessionRuntimeSnapshot {
    return snapshot;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setVisibility(visibility: SessionVisibility): void {
    assertAlive();
    if (snapshot.visibility === visibility) return;
    updateState({ visibility });
  }

  async function cleanup(): Promise<void> {
    if (cleaned) return;
    cleaned = true;
    listeners.clear();
    reconnectAbort?.abort();
    await chat.stop();
  }

  async function send(query: string, options?: SessionSendOptions): Promise<void> {
    assertAlive();
    if (streamTask || (snapshot.phase !== 'idle' && snapshot.phase !== 'error')) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `当前 phase=${snapshot.phase}，不能 send`,
      });
    }

    const requestBody = mapChatTurnRequest({ defaultSessionId: sessionId, query, options });
    const messageId = createUuid();
    await startStream('sending', 'chat.send', async () => {
      await chat.sendMessage(
        {
          id: messageId,
          role: 'user',
          parts: [{ type: 'text', text: query }],
          metadata: buildSendMessageMetadata(options),
        },
        { body: requestBody }
      );
      if (
        chat.status === 'error' &&
        snapshot.phase === 'sending' &&
        chat.lastMessage?.id === messageId
      ) {
        chat.messages = chat.messages.slice(0, -1);
      }
    });
  }

  async function cancel(): Promise<void> {
    assertAlive();
    if (snapshot.phase !== 'streaming' && snapshot.phase !== 'sending') return;

    updateState({ phase: 'canceling' });
    try {
      await chatTurnService.cancelTurn(sessionId);
    } catch (error) {
      if (cleaned) return;
      const convertedError = reportError(error, '取消会话回合失败', 'chat.cancel');
      const canRetry =
        Boolean(streamTask) ||
        (await chatTurnService.getActiveTurnId(sessionId).catch(() => undefined)) !== null;
      if (cleaned) return;
      updateState({ phase: canRetry ? 'streaming' : settledPhase(), error: convertedError });
      throw convertedError;
    }

    if (cleaned) return;
    reconnectAbort?.abort();
    await chat.stop();
    await streamTask?.catch(() => undefined);
    if (!cleaned) updateState({ phase: 'idle', error: undefined });
  }

  async function approve(decisions: SessionApprovalDecision[]): Promise<void> {
    assertAlive();
    const previousPhase = snapshot.phase;
    if (previousPhase !== 'streaming' && previousPhase !== 'hanged') {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `当前 phase=${previousPhase}，不能 approve`,
      });
    }

    const requestBody: ChatRespondApiRequest = {
      session_id: sessionId,
      client_tool_results: [],
      tool_approval_status: decisions.map((decision) => ({
        tool_call_id: decision.toolCallId,
        approved: decision.approved,
      })),
    };

    if (previousPhase === 'streaming') {
      try {
        await chatTurnService.respondTurn(requestBody);
      } catch (error) {
        throw reportError(error, '提交工具审批失败', 'chat.recover');
      }
      return;
    }

    await startStream('streaming', 'chat.recover', () =>
      chat.sendMessage(undefined, { body: requestBody })
    );
  }

  async function loadMoreHistory(): Promise<void> {
    assertAlive();
    if (snapshot.historyLoadingMore || snapshot.historyPage >= snapshot.historyTotalPage) return;

    const nextPage = snapshot.historyPage + 1;
    updateState({ historyLoadingMore: true });
    try {
      const history = await chatTurnService.listHistoryMessages(
        sessionId,
        nextPage,
        HISTORY_PAGE_SIZE
      );
      assertAlive();
      if (nextPage !== snapshot.historyPage + 1) {
        updateState({ historyLoadingMore: false });
        return;
      }
      chat.messages = mergeMessages(history.list, chat.messages);
      updateState({
        historyPage: history.page,
        historyTotalPage: history.totalPage,
        historyLoadingMore: false,
      });
    } catch (error) {
      if (cleaned) return;
      updateState({ historyLoadingMore: false });
      throw reportError(error, '加载更多历史失败', 'chat.bootstrap');
    }
  }

  async function sendMessages({
    body,
    abortSignal,
  }: ChatSendMessagesOptions): Promise<ReadableStream<UIMessageChunk>> {
    assertAlive();
    const requestBody = isRecord(body) ? body : {};
    let response: Response;
    try {
      response = isChatRecoverRequest(requestBody)
        ? await chatTurnService.recoverChatStream(
            pickChatRecoverApiRequest(requestBody),
            abortSignal ?? undefined
          )
        : await chatTurnService.streamChatCompletion(
            pickChatCompletionApiRequest(requestBody),
            abortSignal ?? undefined
          );
    } catch (error) {
      if (abortSignal?.aborted || isWisePenError(error)) throw error;
      throw new WisePenError({
        code: FRONTEND_NETWORK_ERROR.NETWORK,
        source: 'network',
        serverMsg: error instanceof Error ? error.message : '网络请求失败',
        cause: error,
      });
    }

    const stream = await toUiMessageChunkStream(response);
    assertAlive();
    if (snapshot.phase === 'sending') updateState({ phase: 'streaming' });
    return stream;
  }

  async function reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    // AI SDK 在收到重连响应后才创建自己的 AbortController。
    const controller = new AbortController();
    reconnectAbort = controller;
    const { signal } = controller;
    try {
      const response = await chatTurnService.reconnectChatStream(sessionId, signal);
      signal.throwIfAborted();

      if (
        response.status === 204 ||
        ((!response.ok || !isEventStream(response)) &&
          !(await chatTurnService.getActiveTurnId(sessionId)))
      ) {
        void response.body?.cancel();
        const history = await chatTurnService.listHistoryMessages(sessionId, 1, HISTORY_PAGE_SIZE);
        signal.throwIfAborted();
        replaceLatestHistory(history);
        return null;
      }
      return await toUiMessageChunkStream(response);
    } catch (error) {
      if (signal.aborted) return null;
      throw error;
    }
  }

  return {
    chat,
    getSnapshot,
    subscribe,
    bootstrap,
    refresh,
    setVisibility,
    cleanup,
    send,
    cancel,
    approve,
    loadMoreHistory,
  };
}

function mergeMessages(
  olderMessages: readonly WisePenUIMessage[],
  newerMessages: readonly WisePenUIMessage[]
): WisePenUIMessage[] {
  const messagesById = new Map<string, WisePenUIMessage>();
  for (const message of [...olderMessages, ...newerMessages]) {
    messagesById.set(message.id, message);
  }
  return [...messagesById.values()];
}

function hasPendingToolApproval(message: WisePenUIMessage | undefined): boolean {
  return (
    message?.parts.some((part) => isToolUIPart(part) && part.state === 'approval-requested') ??
    false
  );
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

function isChatRecoverRequest(body: Record<string, unknown>): body is ChatRecoverApiRequest {
  return (
    typeof body.session_id === 'string' &&
    Array.isArray(body.client_tool_results) &&
    Array.isArray(body.tool_approval_status)
  );
}

function isEventStream(response: Response): boolean {
  return response.headers.get('content-type')?.includes('text/event-stream') ?? false;
}

async function toUiMessageChunkStream(response: Response): Promise<ReadableStream<UIMessageChunk>> {
  if (!response.ok || !isEventStream(response)) {
    const errorBody: unknown = await response.json().catch(() => undefined);
    const apiError = parseApiErrorBody(errorBody);
    throw new WisePenError({
      code:
        apiError?.code ??
        (response.ok ? FRONTEND_NETWORK_ERROR.INVALID_RESPONSE : FRONTEND_NETWORK_ERROR.HTTP),
      source: apiError?.code === undefined ? 'http' : 'api',
      serverMsg:
        apiError?.message ??
        (response.ok ? '响应不是聊天事件流' : response.statusText || `HTTP ${response.status}`),
      meta: { httpStatus: response.status },
    });
  }

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
        if (!chunk.success) {
          throw createClientError(
            FRONTEND_CLIENT_ERROR.INTERNAL_STATE,
            { reason: '聊天流数据校验失败' },
            chunk.error
          );
        }
        controller.enqueue(chunk.value);
      },
    })
  );
}

function toWisePenError(error: unknown, reason: string): WisePenError {
  if (isWisePenError(error)) return error;
  return createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, { reason }, error);
}
