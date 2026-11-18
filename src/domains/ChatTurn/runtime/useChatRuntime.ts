import type { ChatStatus } from 'ai';

import { useChatTurnService } from '@/domains';
import type { ChatMessageMetadata, WisePenUIMessage } from '@/domains/ChatSession';
import { captureException } from '@/observability';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatRecoverApiRequest, ChatRespondApiRequest } from '../apis/ChatTurnApi.schema';
import { mapChatTurnRequest } from '../mapper/chatTurn.mapper';
import type { SendTurnMessageOptions, ToolApprovalStatusRequest } from '../service/index.type';
import { useConnectFsm } from './connect/useConnectFsm';
import { useResumeLifecycle } from './connect/useResumeLifecycle';
import type { UseChatHistoryResult } from './history/useChatHistory';
import { useChatHistory } from './history/useChatHistory';
import { useChatMessage } from './message/useChatMessage';

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
  stopConnect: () => void;
  submitTurn: (query: string, options?: SendTurnMessageOptions) => Promise<void>;
  submitToolApprovals: (toolApprovalStatus: ToolApprovalStatusRequest[]) => Promise<void>;
  resumeTurn: () => Promise<void>;
  cancelTurn: () => Promise<void>;
  history: UseChatHistoryResult;
}

function buildApprovalRequest(
  sessionId: string,
  toolApprovalStatus: ToolApprovalStatusRequest[]
): ChatRecoverApiRequest & ChatRespondApiRequest {
  return {
    session_id: sessionId,
    client_tool_results: [],
    tool_approval_status: toolApprovalStatus,
  };
}

/**
 * ChatTurn Runtime 组装根：connect FSM 调度 + Service 协议 + message 泵 + history。
 */
export function useChatRuntime({
  sessionId,
  model,
  isNewlyCreatedSession,
  clearNewlyCreatedSession,
  onError,
}: UseChatRuntimeOptions): UseChatRuntimeResult {
  const chatTurnService = useChatTurnService();
  const message = useChatMessage({ onError });
  const connect = useConnectFsm();

  const { resumeTurn, clearResumedTurn, invalidateResume } = useResumeLifecycle({
    sessionId,
    connect,
    pumpResume: message.pumpResume,
    onError,
  });

  /** 用户 stop / cancel：中止泵并标 closed，保留同 session 再 resume 的空间。 */
  const stopConnect = () => {
    message.stop();
    connect.markClosed();
    clearResumedTurn();
  };

  /** 切会话：中止旧泵并作废 resume 世代，连接复位 idle。 */
  const releaseSession = () => {
    message.stop();
    invalidateResume();
  };

  const pumpOutgoing = async (run: () => Promise<void>) => {
    connect.beginConnect();
    try {
      await run();
      connect.markIdleIfOpen();
    } catch (error) {
      connect.markClosed();
      clearResumedTurn();
      throw error;
    }
  };

  const submitTurn = async (query: string, options?: SendTurnMessageOptions) => {
    const requestBody = mapChatTurnRequest({
      defaultSessionId: sessionId,
      defaultModel: model,
      query,
      options,
    });
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

    await pumpOutgoing(async () => {
      const response = await chatTurnService.streamChatCompletion(requestBody);
      connect.markOpen();
      await message.pumpSend({
        response,
        userMessage: { text: query, metadata },
      });
    });
  };

  const submitToolApprovals = async (toolApprovalStatus: ToolApprovalStatusRequest[]) => {
    if (!sessionId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: '恢复聊天时缺少 session_id',
      });
    }

    const requestBody = buildApprovalRequest(sessionId, toolApprovalStatus);

    try {
      // 连接仍活着：只 respond，不新开 SSE。
      if (connect.isLive()) {
        await chatTurnService.respondTurn(requestBody);
        return;
      }

      const activeTurnId = await chatTurnService.getActiveTurnId(sessionId);
      // 查询期间连接可能又活了；按最新 connect 相位重判。
      const action = connect.resolveContinuation(activeTurnId);

      if (action === 'respond') {
        await chatTurnService.respondTurn(requestBody);
        return;
      }

      if (action === 'respond_resume') {
        await chatTurnService.respondTurn(requestBody);
        await resumeTurn();
        return;
      }

      await pumpOutgoing(async () => {
        const response = await chatTurnService.recoverChatStream(requestBody);
        connect.markOpen();
        await message.pumpSend({ response });
      });
    } catch (error) {
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.approval',
      });
      throw error;
    }
  };

  const cancelTurn = async (): Promise<void> => {
    if (!sessionId) return;
    stopConnect();
    await chatTurnService.cancelTurn(sessionId);
  };

  const history = useChatHistory({
    sessionId: sessionId || null,
    setMessages: message.setMessages,
    resumeTurnStream: resumeTurn,
    stop: releaseSession,
    isNewlyCreatedSession,
    clearNewlyCreatedSession,
  });

  return {
    messages: message.messages,
    status: message.status,
    stopConnect,
    submitTurn,
    submitToolApprovals,
    resumeTurn,
    cancelTurn,
    history,
  };
}
