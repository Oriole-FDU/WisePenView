/**
 * 提供发送、取消与工具审批提交等连接侧动作。
 */
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
  send: (query: string, options?: SendTurnMessageOptions) => Promise<void>;
  cancel: () => Promise<void>;
  cancelling: boolean;
  stopConnect: () => void;
  submitToolApprovals: (toolApprovalStatus: ToolApprovalStatusRequest[]) => Promise<void>;
}

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
    // 同 session 已在取消中则跳过
    if (!sessionId || cancellingSessionId === sessionId) return;

    setCancellingSessionId(sessionId);
    try {
      // 先拆本地连接，再通知后端 cancel
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
      // 活连接：只 respond，不新开 SSE
      if (connect.isLive()) {
        await chatTurnService.respondTurn(command);
        return;
      }

      // 查询期间连接可能又活了；按最新相位分流
      const activeTurnId = await chatTurnService.getActiveTurnId(sessionId);
      const action = connect.resolveContinuation(activeTurnId);

      if (action === 'respond') {
        await chatTurnService.respondTurn(command);
        return;
      }

      // 有活跃 turn：先 respond，再 resume 接上旧流
      if (action === 'respond_resume') {
        await chatTurnService.respondTurn(command);
        await resumeTurn();
        return;
      }

      // 无活跃 turn：recover 开新流并泵入
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
