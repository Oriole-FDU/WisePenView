/**
 * 提供发送、取消与工具审批提交等连接侧动作。
 */
import { useRef, useState } from 'react';

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
  cancelResume: () => void;
  resumeTurn: () => Promise<void>;
}

export interface UseConnectActionsResult {
  send: (query: string, options?: SendTurnMessageOptions) => Promise<void>;
  cancel: () => Promise<void>;
  cancelling: boolean;
  connectActive: boolean;
  stopConnect: () => void;
  submitToolApprovals: (toolApprovalStatus: ToolApprovalStatusRequest[]) => Promise<void>;
}

export function useConnectActions({
  sessionId,
  model,
  chatTurnService,
  connect,
  message,
  cancelResume,
  resumeTurn,
}: UseConnectActionsOptions): UseConnectActionsResult {
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);
  const activeOperationRef = useRef<{
    sessionId: string;
    controller: AbortController;
  } | null>(null);

  const beginOperation = (targetSessionId: string) => {
    const operation = {
      sessionId: targetSessionId,
      controller: new AbortController(),
    };
    activeOperationRef.current = operation;
    return {
      signal: operation.controller.signal,
      isCurrent: () => activeOperationRef.current === operation,
      finish: () => {
        if (activeOperationRef.current === operation) activeOperationRef.current = null;
      },
    };
  };

  const cancelActiveOperation = () => {
    const operation = activeOperationRef.current;
    activeOperationRef.current = null;
    operation?.controller.abort();
    return operation?.sessionId;
  };

  const stopConnect = () => {
    cancelActiveOperation();
    cancelResume();
    message.stop();
    connect.markClosed();
  };

  const send = async (query: string, options?: SendTurnMessageOptions) => {
    if (connect.isLive() || activeOperationRef.current) return;

    const targetSessionId = options?.sessionId ?? sessionId;
    const operation = beginOperation(targetSessionId);
    try {
      await runNewStreamConnect({
        connect,
        shouldApply: operation.isCurrent,
        run: async () => {
          const response = await chatTurnService.streamChatCompletion(
            {
              sessionId: targetSessionId,
              model,
              query,
              options,
            },
            operation.signal
          );
          if (!operation.isCurrent()) {
            void response.body?.cancel();
            return;
          }
          connect.markOpen();
          await message.pumpSend({
            response,
            turn: { query, options },
          });
        },
      });
    } finally {
      operation.finish();
    }
  };

  const cancel = async (): Promise<void> => {
    const targetSessionId = activeOperationRef.current?.sessionId ?? sessionId;
    // 同 session 已在取消中则跳过
    if (!targetSessionId || cancellingSessionId === targetSessionId) return;

    setCancellingSessionId(targetSessionId);
    try {
      // 先拆本地连接，再通知后端 cancel
      stopConnect();
      await chatTurnService.cancelTurn(targetSessionId);
    } finally {
      setCancellingSessionId((current) => (current === targetSessionId ? null : current));
    }
  };

  const submitToolApprovals = async (toolApprovalStatus: ToolApprovalStatusRequest[]) => {
    if (!sessionId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: '恢复聊天时缺少 session_id',
      });
    }

    const command = { sessionId, toolApprovalStatus };
    const operation = beginOperation(sessionId);

    try {
      // 活连接：只 respond，不新开 SSE
      if (connect.isLive()) {
        await chatTurnService.respondTurn(command);
        return;
      }

      // 查询期间连接可能又活了；按最新相位分流
      const activeTurnId = await chatTurnService.getActiveTurnId(sessionId, operation.signal);
      if (!operation.isCurrent()) return;
      const action = connect.resolveContinuation(activeTurnId);

      if (action === 'respond') {
        await chatTurnService.respondTurn(command);
        return;
      }

      // 有活跃 turn：先 respond，再 resume 接上旧流
      if (action === 'respond_resume') {
        await chatTurnService.respondTurn(command);
        if (!operation.isCurrent()) return;
        cancelResume();
        await resumeTurn();
        return;
      }

      // 无活跃 turn：recover 开新流并泵入
      await runNewStreamConnect({
        connect,
        shouldApply: operation.isCurrent,
        run: async () => {
          const response = await chatTurnService.recoverChatStream(command, operation.signal);
          if (!operation.isCurrent()) {
            void response.body?.cancel();
            return;
          }
          connect.markOpen();
          await message.pumpSend({ response });
        },
      });
    } catch (error) {
      if (!operation.isCurrent()) return;
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.approval',
      });
      throw error;
    } finally {
      operation.finish();
    }
  };

  return {
    send,
    cancel,
    cancelling: cancellingSessionId !== null,
    connectActive: connect.phase === 'connecting' || connect.phase === 'open',
    stopConnect,
    submitToolApprovals,
  };
}
