import { useChat } from '@ai-sdk/react';
import { useLatest } from 'ahooks';
import { type ChatStatus, DefaultChatTransport } from 'ai';
import { useMemo, useRef } from 'react';

import { useChatTurnService } from '@/domains';
import type { ChatMessageMetadata, WisePenUIMessage } from '@/domains/ChatSession';
import { captureException } from '@/observability';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatRecoverApiRequest } from '../apis/ChatTurnApi.schema';
import { mapChatTurnRequest } from '../mapper/chatTurn.mapper';
import type {
  IChatTurnService,
  SendTurnMessageOptions,
  ToolApprovalStatusRequest,
} from '../service/index.type';
import { useChatControl } from './control/useChatControl';
import { useChatHistory } from './useChatHistory';
import type { UseChatTurnHistoryResult } from './useChatTurnHistory';
import { useChatTurnHistory } from './useChatTurnHistory';

const CHAT_STREAM_THROTTLE_MS = 50;
const DEFAULT_HISTORY_PAGE_SIZE = 100;

export interface UseChatRuntimeOptions {
  sessionId: string;
  model?: string;
  isNewlyCreatedSession: (sessionId: string) => boolean;
  clearNewlyCreatedSession: (sessionId: string) => void;
  onError?: (error: Error) => void;
}

export interface UseChatRuntimeResult {
  messages: WisePenUIMessage[];
  status: ChatStatus;
  stopLocalStream: () => void;
  submitTurn: (query: string, options?: SendTurnMessageOptions) => Promise<void>;
  submitToolApprovals: (toolApprovalStatus: ToolApprovalStatusRequest[]) => Promise<void>;
  resumeTurn: () => Promise<void>;
  cancelTurn: () => Promise<void>;
  history: UseChatTurnHistoryResult;
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

const createChatTransport = (fetchChatCompletion: IChatTurnService['fetchChatCompletion']) =>
  new DefaultChatTransport<WisePenUIMessage>({
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

export function useChatRuntime({
  sessionId,
  model,
  isNewlyCreatedSession,
  clearNewlyCreatedSession,
  onError,
}: UseChatRuntimeOptions): UseChatRuntimeResult {
  const chatTurnService = useChatTurnService();

  /**
   * @wisepen-manual-memo
   * 为什么：DefaultChatTransport 会持有底层 fetch，重复创建会让 useChat 误判传输实例变化。
   * 收益：仅在服务传输函数变化时重建，稳定聊天会话与重连逻辑。
   * 失效条件：fetchChatCompletion 引用变化。
   */
  const chatTransport = useMemo(
    () => createChatTransport(chatTurnService.fetchChatCompletion),
    [chatTurnService.fetchChatCompletion]
  );

  // --- 应下沉 Pipeline：唯一 useChat 实例与 messages 视图 ---
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

  // --- Control：message loading 状态机；后续切会话 / 停流下沉至此 ---
  const control = useChatControl();

  // --- 应下沉 Pipeline：历史分页写入同一份 messages ---
  const historyStore = useChatHistory({
    sessionId: sessionId || null,
    pageSize: DEFAULT_HISTORY_PAGE_SIZE,
    loadPage: chatTurnService.listHistoryMessages,
    setMessages: chat.setMessages,
    loading: control.message,
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
  const latestGetActiveTurnId = useLatest(chatTurnService.getActiveTurnId);
  const latestOnError = useLatest(onError);

  const stopLocalStream = () => {
    void chat.stop();
  };

  const resumeTurn = (): Promise<void> => {
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
        const turnId = await latestGetActiveTurnId.current(targetSessionId);
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

  // --- 应下沉 Service：submit / recover 请求映射 ---
  const submitTurn = async (query: string, options?: SendTurnMessageOptions) => {
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

  /** 本步薄委托 recover；审批续跑矩阵（respond / resume / recover）留给后续 Phase。 */
  const submitToolApprovals = async (toolApprovalStatus: ToolApprovalStatusRequest[]) => {
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

  const cancelTurn = async (): Promise<void> => {
    if (!sessionId) return;
    stopLocalStream();
    await chatTurnService.cancelTurn(sessionId);
  };

  /**
   * 临时内聚：目标归属 UI/Controller 的历史分页态。
   * 本步为行为不回归继续由 Runtime 返回；切会话 stop 仍走内部 cleanup。
   */
  const history = useChatTurnHistory({
    history: historyStore,
    loadingInitial: control.message.loadingInitial,
    loadingMore: control.message.loadingMore,
    resumeTurnStream: resumeTurn,
    stop: stopLocalStream,
    isNewlyCreatedSession,
    clearNewlyCreatedSession,
  });

  return {
    messages: chat.messages,
    status: chat.status,
    stopLocalStream,
    submitTurn,
    submitToolApprovals,
    resumeTurn,
    cancelTurn,
    history,
  };
}
