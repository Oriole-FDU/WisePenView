import { useChat } from '@ai-sdk/react';
import { useLatest } from 'ahooks';
import { DefaultChatTransport } from 'ai';
import { useMemo, useRef } from 'react';

import { buildApiUrl } from '@/apis/buildApiUrl';
import { useChatTurnService } from '@/domains';
import type { ChatMessageMetadata, WisePenUIMessage } from '@/domains/ChatSession';
import { captureException } from '@/observability';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatRecoverApiRequest } from '../apis/ChatTurnApi.schema';
import {
  pickChatCompletionApiRequest,
  pickChatRecoverApiRequest,
} from '../apis/ChatTurnApi.schema';
import { mapChatTurnRequest } from '../mapper/chatTurn.mapper';
import type {
  SendTurnMessageOptions,
  ToolApprovalStatusRequest,
  UseChatTurnOptions,
} from '../service/index.type';
import { normalizeChatSseResponse } from './chatSseNormalizer';
import { useChatHistory } from './useChatHistory';
import { useChatTurnHistory } from './useChatTurnHistory';

const CHAT_STREAM_THROTTLE_MS = 50;
const DEFAULT_HISTORY_PAGE_SIZE = 100;

function resolveChatApiUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' || input instanceof URL
    ? new URL(input.toString(), buildApiUrl('/')).toString()
    : input.url;
}

async function fetchChatCompletion(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  streamApi: Pick<
    UseChatTurnOptions,
    'streamChatCompletion' | 'recoverChatStream' | 'reconnectChatStream'
  >
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

function isChatRecoverRequest(
  body: Record<string, unknown> | undefined
): body is ChatRecoverApiRequest {
  return (
    typeof body?.session_id === 'string' &&
    Array.isArray(body.client_tool_results) &&
    Array.isArray(body.tool_approval_status)
  );
}

const createChatTransport = (
  streamApi: Pick<
    UseChatTurnOptions,
    'streamChatCompletion' | 'recoverChatStream' | 'reconnectChatStream'
  >
) =>
  new DefaultChatTransport<WisePenUIMessage>({
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

/**
 * Chat 消息运行时：唯一组装 messages 的模块。
 *
 * 1) 持有 useChat（SSE 增量）与 useChatHistory（历史 hydrate），写入同一份列表
 * 2) 编排会话切换时的历史加载与流恢复
 * 3) 对上只暴露聚合后的 messages / status / history UI 态，不外泄 setMessages
 */
export const useChatTurn = ({
  sessionId,
  model,
  getActiveTurnId,
  streamChatCompletion,
  recoverChatStream,
  reconnectChatStream,
  isNewlyCreatedSession,
  clearNewlyCreatedSession,
  onError,
}: UseChatTurnOptions) => {
  const chatTurnService = useChatTurnService();
  /**
   * @wisepen-manual-memo
   * 为什么：DefaultChatTransport 会持有底层 fetch，重复创建会让 useChat 误判传输实例变化。
   * 收益：仅在服务传输函数变化时重建，稳定聊天会话与重连逻辑。
   * 失效条件：streamChatCompletion、recoverChatStream 或 reconnectChatStream 引用变化。
   */
  const chatTransport = useMemo(
    () => createChatTransport({ streamChatCompletion, recoverChatStream, reconnectChatStream }),
    [recoverChatStream, reconnectChatStream, streamChatCompletion]
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
  const historyStore = useChatHistory({
    sessionId: sessionId || null,
    pageSize: DEFAULT_HISTORY_PAGE_SIZE,
    loadPage: chatTurnService.listHistoryMessages,
    setMessages: chat.setMessages,
  });
  const resumeRequestRef = useRef<{
    sessionId: string;
    resumeStream: typeof chat.resumeStream;
    promise: Promise<void>;
  } | null>(null);
  const resumedTurnRef = useRef<{
    sessionId: string;
    turnId: string;
    resumeStream: typeof chat.resumeStream;
  } | null>(null);
  const latestSessionId = useLatest(sessionId);
  const latestResumeStream = useLatest(chat.resumeStream);
  const latestActiveTurnId = useLatest(getActiveTurnId);
  const latestOnError = useLatest(onError);

  const resumeTurnStream = (): Promise<void> => {
    if (!sessionId) return Promise.resolve();

    const targetSessionId = sessionId;
    const targetResumeStream = chat.resumeStream;
    const existingRequest = resumeRequestRef.current;
    if (
      existingRequest?.sessionId === targetSessionId &&
      existingRequest.resumeStream === targetResumeStream
    ) {
      return existingRequest.promise;
    }

    const promise = (async () => {
      try {
        const turnId = await latestActiveTurnId.current(targetSessionId);
        if (
          latestSessionId.current !== targetSessionId ||
          latestResumeStream.current !== targetResumeStream
        ) {
          return;
        }
        if (!turnId) return;

        const resumedTurn = resumedTurnRef.current;
        if (
          resumedTurn?.sessionId === targetSessionId &&
          resumedTurn.turnId === turnId &&
          resumedTurn.resumeStream === targetResumeStream
        ) {
          return;
        }
        // 先记录目标 turn，再建立连接，避免重复生命周期同时发起两条 SSE。
        resumedTurnRef.current = {
          sessionId: targetSessionId,
          turnId,
          resumeStream: targetResumeStream,
        };
        await targetResumeStream({ body: { session_id: targetSessionId } });
      } catch (error) {
        if (
          latestSessionId.current !== targetSessionId ||
          latestResumeStream.current !== targetResumeStream
        ) {
          return;
        }
        captureException(error, {
          detector: 'application-handled',
          operation: 'chat.resume',
        });
        if (error instanceof Error) {
          latestOnError.current?.(error);
        }
      }
    })();

    // 保留已完成请求，当前会话生命周期内不再次查询 active；会话切换后由 sessionId 区分请求。
    resumeRequestRef.current = {
      sessionId: targetSessionId,
      resumeStream: targetResumeStream,
      promise,
    };
    return promise;
  };

  const sendTurnMessage = async (query: string, options?: SendTurnMessageOptions) => {
    const requestBody = mapChatTurnRequest({
      defaultSessionId: sessionId,
      defaultModel: model,
      query,
      options,
    });
    // 仅用于当次会话 UI；历史回放待后端 listHistoryMessages 透出 metadata
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
    const metadata: ChatMessageMetadata = {
      createdAt: new Date().toISOString(),
      ...(selectedAttachments.length > 0 ? { selectedAttachments } : {}),
    };
    await chat.sendMessage({ text: query, metadata }, { body: requestBody });
  };

  const recoverTurn = async (toolApprovalStatus: ToolApprovalStatusRequest[]) => {
    try {
      if (!sessionId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: '恢复聊天时缺少 session_id',
        });
      }
      const requestBody: ChatRecoverApiRequest = {
        session_id: sessionId,
        client_tool_results: [],
        tool_approval_status: toolApprovalStatus,
      };
      await chat.sendMessage(undefined, { body: requestBody });
    } catch (error) {
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.recover',
      });
      throw error;
    }
  };

  const history = useChatTurnHistory({
    history: historyStore,
    resumeTurnStream,
    stop: chat.stop,
    isNewlyCreatedSession,
    clearNewlyCreatedSession,
  });

  return {
    messages: chat.messages,
    status: chat.status,
    stop: chat.stop,
    sendTurnMessage,
    recoverTurn,
    resumeTurnStream,
    history,
  };
};
