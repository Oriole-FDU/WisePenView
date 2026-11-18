import { useState } from 'react';

import { captureException } from '@/observability';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  IChatTurnService,
  SendTurnMessageOptions,
  ToolApprovalStatusRequest,
} from '../../service/index.type';
import type { UseChatMessageResult } from '../message/useChatMessage';
import { runNewStreamConnect } from './runNewStreamConnect';
import type { UseConnectFsmResult } from './useConnectFsm';

export interface UseConnectActionsOptions {
  sessionId: string;
  model?: string;
  chatTurnService: IChatTurnService;
  connect: UseConnectFsmResult;
  message: UseChatMessageResult;
  clearResumedTurn: () => void;
  resumeTurn: () => Promise<void>;
}

export interface UseConnectActionsResult {
  /** 协议级发送：已有 sessionId + 载荷后开泵；不含 UI 门禁。 */
  send: (query: string, options?: SendTurnMessageOptions) => Promise<void>;
  /** 本地 stopConnect + 后端 cancel；自带 cancelling 互斥。 */
  cancel: () => Promise<void>;
  cancelling: boolean;
  /** 用户 stop / cancel：中止泵并标 closed，保留同 session 再 resume 的空间。 */
  stopConnect: () => void;
  /** 审批续跑：按连接相位选 respond / respond+resume / recover。 */
  submitToolApprovals: (toolApprovalStatus: ToolApprovalStatusRequest[]) => Promise<void>;
}

/**
 * 本地流开停与审批续跑：send 开 completion 流，cancel/stop 关流，
 * submitToolApprovals 按相位选 respond / resume / recover；开流事务复用 runNewStreamConnect。
 * 发送/审批 wire DTO 由 Service 组装；乐观 user 气泡由 message 泵组装；本层只传领域意图。
 */
export function useConnectActions({
  sessionId,
  model,
  chatTurnService,
  connect,
  message,
  clearResumedTurn,
  resumeTurn,
}: UseConnectActionsOptions): UseConnectActionsResult {
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);

  const stopConnect = () => {
    message.stop();
    connect.markClosed();
    clearResumedTurn();
  };

  const send = async (query: string, options?: SendTurnMessageOptions) => {
    await runNewStreamConnect({
      connect,
      onClosed: clearResumedTurn,
      run: async () => {
        const response = await chatTurnService.streamChatCompletion({
          sessionId,
          model,
          query,
          options,
        });
        connect.markOpen();
        await message.pumpSend({
          response,
          turn: { query, options },
        });
      },
    });
  };

  const cancel = async (): Promise<void> => {
    if (!sessionId || cancellingSessionId === sessionId) return;

    setCancellingSessionId(sessionId);
    try {
      stopConnect();
      await chatTurnService.cancelTurn(sessionId);
    } finally {
      setCancellingSessionId((current) => (current === sessionId ? null : current));
    }
  };

  const submitToolApprovals = async (toolApprovalStatus: ToolApprovalStatusRequest[]) => {
    if (!sessionId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: '恢复聊天时缺少 session_id',
      });
    }

    const command = { sessionId, toolApprovalStatus };

    try {
      // 连接仍活着：只 respond，不新开 SSE。
      if (connect.isLive()) {
        await chatTurnService.respondTurn(command);
        return;
      }

      const activeTurnId = await chatTurnService.getActiveTurnId(sessionId);
      // 查询期间连接可能又活了；按最新 connect 相位重判。
      const action = connect.resolveContinuation(activeTurnId);

      if (action === 'respond') {
        await chatTurnService.respondTurn(command);
        return;
      }

      if (action === 'respond_resume') {
        await chatTurnService.respondTurn(command);
        await resumeTurn();
        return;
      }

      await runNewStreamConnect({
        connect,
        onClosed: clearResumedTurn,
        run: async () => {
          const response = await chatTurnService.recoverChatStream(command);
          connect.markOpen();
          await message.pumpSend({ response });
        },
      });
    } catch (error) {
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.approval',
      });
      throw error;
    }
  };

  return {
    send,
    cancel,
    cancelling: cancellingSessionId === sessionId,
    stopConnect,
    submitToolApprovals,
  };
}
