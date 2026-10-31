import { useChat } from '@ai-sdk/react';
import { useLatest } from 'ahooks';
import { DefaultChatTransport } from 'ai';
import { useMemo, useRef } from 'react';

import { buildApiUrl } from '@/apis/buildApiUrl';
import type { ChatMessageMetadata, WisePenUIMessage } from '@/domains/ChatSession';
import { captureException } from '@/observability';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import {
  pickChatCompletionApiRequest,
  pickChatRecoverApiRequest,
} from '../apis/ChatStreamApi.schema';
import { mapChatCompletionRequest } from '../mapper/chatCompletion.mapper';
import { normalizeChatSseResponse } from './chatSseNormalizer';
import type {
  ChatRecoverRequest,
  SendSessionMessageOptions,
  ToolApprovalStatusRequest,
  UseChatSessionOptions,
} from './index.type';

const CHAT_STREAM_THROTTLE_MS = 50;

function resolveChatApiUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' || input instanceof URL
    ? new URL(input.toString(), buildApiUrl('/')).toString()
    : input.url;
}

async function fetchChatCompletion(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  streamApi: Pick<
    UseChatSessionOptions,
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
): body is ChatRecoverRequest {
  return (
    typeof body?.session_id === 'string' &&
    Array.isArray(body.client_tool_results) &&
    Array.isArray(body.tool_approval_status)
  );
}

const createChatTransport = (
  streamApi: Pick<
    UseChatSessionOptions,
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
 * 对 useChat 的薄封装：
 * 1) 统一请求地址到 /chat/completions
 * 2) 统一补齐后端 ChatRequest 字段
 * 3) 保留 useChat 原始能力（messages、status、stop 等）
 */
export const useChatSession = ({
  sessionId,
  model,
  getActiveTurnId,
  streamChatCompletion,
  recoverChatStream,
  reconnectChatStream,
  onError,
}: UseChatSessionOptions) => {
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

  const resumeSessionStream = (): Promise<void> => {
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

  const sendSessionMessage = async (query: string, options?: SendSessionMessageOptions) => {
    const requestBody = mapChatCompletionRequest({
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

  const recoverSession = async (toolApprovalStatus: ToolApprovalStatusRequest[]) => {
    try {
      if (!sessionId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: '恢复聊天时缺少 session_id',
        });
      }
      const requestBody: ChatRecoverRequest = {
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

  return {
    ...chat,
    sendSessionMessage,
    recoverSession,
    resumeSessionStream,
  };
};
