import { awaitAddrReady, buildApiUrl, notifyAddrFailure } from '@/apis/apiServerAddr';
import { applyXDeveloperHeader } from '@/apis/developmentTraffic';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { useChat } from '@ai-sdk/react';
import { useLatest } from 'ahooks';
import { DefaultChatTransport } from 'ai';
import { useRef } from 'react';
import type { ChatMessageMetadata, WisePenUIMessage } from '../entity/message';
import { mapChatCompletionRequest } from '../mapper/chatCompletion.mapper';
import { normalizeChatSseResponse } from './chatSseNormalizer';
import type {
  ChatRecoverRequest,
  SendSessionMessageOptions,
  ToolApprovalStatusRequest,
  UseChatSessionOptions,
} from './index.type';

const CHAT_STREAM_THROTTLE_MS = 50;

function buildChatFetchInit(init?: RequestInit): RequestInit {
  return {
    ...init,
    credentials: 'include',
    headers: applyXDeveloperHeader(new Headers(init?.headers)),
  };
}

function resolveChatApiUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' || input instanceof URL
    ? new URL(input.toString(), buildApiUrl('/')).toString()
    : input.url;
}

async function fetchChatCompletion(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  await awaitAddrReady();
  try {
    const response = await fetch(resolveChatApiUrl(input), buildChatFetchInit(init));
    return normalizeChatSseResponse(response);
  } catch (error) {
    notifyAddrFailure();
    throw error;
  }
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

const chatTransport = new DefaultChatTransport<WisePenUIMessage>({
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
 * 对 useChat 的薄封装：
 * 1) 统一请求地址到 /chat/completions
 * 2) 统一补齐后端 ChatRequest 字段
 * 3) 保留 useChat 原始能力（messages、status、stop 等）
 */
export const useChatSession = ({
  sessionId,
  model,
  getActiveTurnId,
  onError,
}: UseChatSessionOptions) => {
  const chat = useChat<WisePenUIMessage>({
    experimental_throttle: CHAT_STREAM_THROTTLE_MS,
    onError,
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
  };

  return {
    ...chat,
    sendSessionMessage,
    recoverSession,
    resumeSessionStream,
  };
};
