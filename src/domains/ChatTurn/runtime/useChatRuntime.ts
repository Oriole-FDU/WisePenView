import { useLatest } from 'ahooks';
import type { ChatStatus } from 'ai';
import { useRef } from 'react';

import { useChatTurnService } from '@/domains';
import type { ChatMessageMetadata, WisePenUIMessage } from '@/domains/ChatSession';
import { captureException } from '@/observability';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { ChatRecoverApiRequest } from '../apis/ChatTurnApi.schema';
import { mapChatTurnRequest } from '../mapper/chatTurn.mapper';
import type { SendTurnMessageOptions, ToolApprovalStatusRequest } from '../service/index.type';
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
  stopLocalStream: () => void;
  submitTurn: (query: string, options?: SendTurnMessageOptions) => Promise<void>;
  submitToolApprovals: (toolApprovalStatus: ToolApprovalStatusRequest[]) => Promise<void>;
  resumeTurn: () => Promise<void>;
  cancelTurn: () => Promise<void>;
  history: UseChatHistoryResult;
}

/**
 * ChatTurn Runtime 组装根：message（权威源）+ history（分页写入）+ submit/recover 映射。
 *
 * 不外泄 setMessages / 散落流 API；Controller / UI 只消费本契约。
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

  const resumeRequestRef = useRef<{
    sessionId: string;
    resumeStream: typeof message.resumeStream;
    promise: Promise<void>;
  } | null>(null);
  const resumedTurnRef = useRef<{
    sessionId: string;
    turnId: string;
    resumeStream: typeof message.resumeStream;
  } | null>(null);
  const latestSessionId = useLatest(sessionId);
  const latestResumeStream = useLatest(message.resumeStream);
  const latestGetActiveTurnId = useLatest(chatTurnService.getActiveTurnId);
  const latestOnError = useLatest(onError);

  const stopLocalStream = () => {
    void message.stop();
  };

  const resumeTurn = (): Promise<void> => {
    if (!sessionId) return Promise.resolve();

    const targetSessionId = sessionId;
    const targetResumeStream = message.resumeStream;
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
    await message.sendMessage({ text: query, metadata }, { body: requestBody });
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
      await message.sendMessage(undefined, { body: requestBody });
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

  // --- History：fsm + data + 切会话生命周期内聚；经 message.setMessages 写入权威源 ---
  const history = useChatHistory({
    sessionId: sessionId || null,
    setMessages: message.setMessages,
    resumeTurnStream: resumeTurn,
    stop: stopLocalStream,
    isNewlyCreatedSession,
    clearNewlyCreatedSession,
  });

  return {
    messages: message.messages,
    status: message.status,
    stopLocalStream,
    submitTurn,
    submitToolApprovals,
    resumeTurn,
    cancelTurn,
    history,
  };
}
