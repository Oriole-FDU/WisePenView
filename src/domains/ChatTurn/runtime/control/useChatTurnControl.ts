import { useState } from 'react';

import { mapChatTurnRequest, mapOutgoingUserMessageMetadata } from '../../mapper/chatTurn.mapper';
import type { IChatTurnService, SendTurnMessageOptions } from '../../service/index.type';
import { runNewStreamConnect } from '../connect/runNewStreamConnect';
import type { UseConnectFsmResult } from '../connect/useConnectFsm';
import type { UseChatMessageResult } from '../message/useChatMessage';

export interface UseChatTurnControlOptions {
  sessionId: string;
  model?: string;
  chatTurnService: IChatTurnService;
  connect: UseConnectFsmResult;
  message: UseChatMessageResult;
  clearResumedTurn: () => void;
}

export interface UseChatTurnControlResult {
  /** 协议级发送：已有 sessionId + 载荷后开泵；不含 UI 门禁。 */
  send: (query: string, options?: SendTurnMessageOptions) => Promise<void>;
  /** 本地 stopConnect + 后端 cancel；自带 cancelling 互斥。 */
  cancel: () => Promise<void>;
  cancelling: boolean;
  /** 用户 stop / cancel：中止泵并标 closed，保留同 session 再 resume 的空间。 */
  stopConnect: () => void;
}

/**
 * 回合控制：用户发起的 send / cancel / stop。
 *
 * 调度 connect + Service 取流 + message 泵；不持有审批与历史，不做 UI 门禁。
 */
export function useChatTurnControl({
  sessionId,
  model,
  chatTurnService,
  connect,
  message,
  clearResumedTurn,
}: UseChatTurnControlOptions): UseChatTurnControlResult {
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
