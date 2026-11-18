import { useState } from 'react';

import { mapChatTurnRequest, mapOutgoingUserMessageMetadata } from '../../mapper/chatTurn.mapper';
import type { IChatTurnService, SendTurnMessageOptions } from '../../service/index.type';
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
}

export interface UseConnectActionsResult {
  /** 协议级发送：已有 sessionId + 载荷后开泵；不含 UI 门禁。 */
  send: (query: string, options?: SendTurnMessageOptions) => Promise<void>;
  /** 本地 stopConnect + 后端 cancel；自带 cancelling 互斥。 */
  cancel: () => Promise<void>;
  cancelling: boolean;
  /** 用户 stop / cancel：中止泵并标 closed，保留同 session 再 resume 的空间。 */
  stopConnect: () => void;
}

/**
 * 本地流开停动作：send 开 completion 流，cancel/stop 关流。
 *
 * 属于 connect 生命周期，不做审批续跑选路；开流事务复用 runNewStreamConnect。
 */
export function useConnectActions({
  sessionId,
  model,
  chatTurnService,
  connect,
  message,
  clearResumedTurn,
}: UseConnectActionsOptions): UseConnectActionsResult {
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);

  const stopConnect = () => {
    message.stop();
    connect.markClosed();
    clearResumedTurn();
  };

  const send = async (query: string, options?: SendTurnMessageOptions) => {
    const requestBody = mapChatTurnRequest({
      defaultSessionId: sessionId,
      defaultModel: model,
      query,
      options,
    });
    const metadata = mapOutgoingUserMessageMetadata(options);

    await runNewStreamConnect({
      connect,
      onClosed: clearResumedTurn,
      run: async () => {
        const response = await chatTurnService.streamChatCompletion(requestBody);
        connect.markOpen();
        await message.pumpSend({
          response,
          userMessage: { text: query, metadata },
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

  return {
    send,
    cancel,
    cancelling: cancellingSessionId === sessionId,
    stopConnect,
  };
}
