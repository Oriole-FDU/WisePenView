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
      if (connect.isLive()) {
        await chatTurnService.respondTurn(command);
        return;
      }

      const activeTurnId = await chatTurnService.getActiveTurnId(sessionId);
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
