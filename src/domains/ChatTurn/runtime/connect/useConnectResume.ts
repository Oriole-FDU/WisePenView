import { useLatest } from 'ahooks';
import { useRef } from 'react';

import { useChatTurnService } from '@/domains';
import { captureException } from '@/observability';

import type { UseConnectFsmResult } from './useConnectFsm';

export interface UseConnectResumeOptions {
  sessionId: string;
  connect: UseConnectFsmResult;
  pumpResume: (options: { response: Response }) => Promise<void>;
  onError?: (error: Error) => void;
}

export interface UseConnectResumeResult {
  resumeTurn: () => Promise<void>;
  clearResumedTurn: () => void;
  invalidateResume: () => void;
}

export function useConnectResume({
  sessionId,
  connect,
  pumpResume,
  onError,
}: UseConnectResumeOptions): UseConnectResumeResult {
  const { getActiveTurnId, reconnectChatStream } = useChatTurnService();
  const inFlightRef = useRef<{ sessionId: string; promise: Promise<void> } | null>(null);
  const resumedTurnRef = useRef<{ sessionId: string; turnId: string } | null>(null);
  const resumeEpochRef = useRef(0);
  const latestSessionId = useLatest(sessionId);

  const clearResumedTurn = () => {
    resumedTurnRef.current = null;
  };

  const invalidateResume = () => {
    resumeEpochRef.current += 1;
    inFlightRef.current = null;
    resumedTurnRef.current = null;
    connect.reset();
  };

  const resumeTurn = (): Promise<void> => {
    // 无 sessionId 时无需 resume
    if (!sessionId) return Promise.resolve();

    // 有 sessionId 时，先检查是否已有 in-flight 请求
    const targetSessionId = sessionId;
    const existing = inFlightRef.current;
    if (existing?.sessionId === targetSessionId) {
      return existing.promise;
    }

    // 检查是否已在连接中
    if (connect.isLive()) {
      return Promise.resolve();
    }

    // 重连
    const promise = (async () => {
      const epoch = resumeEpochRef.current;
      const isStale = () =>
        resumeEpochRef.current !== epoch || latestSessionId.current !== targetSessionId;

      connect.beginConnect();
      try {
        const turnId = await getActiveTurnId(targetSessionId);
        if (isStale()) return;
        if (!turnId) {
          connect.markIdle();
          return;
        }

        const resumed = resumedTurnRef.current;
        if (resumed?.sessionId === targetSessionId && resumed.turnId === turnId) {
          connect.markIdle();
          return;
        }

        resumedTurnRef.current = { sessionId: targetSessionId, turnId };
        const response = await reconnectChatStream(targetSessionId);
        if (isStale()) return;

        connect.markOpen();
        await pumpResume({ response });
        if (isStale()) return;
        connect.markIdleIfOpen();
      } catch (error) {
        if (isStale()) return;
        connect.markClosed();
        resumedTurnRef.current = null;
        captureException(error, {
          detector: 'application-handled',
          operation: 'chat.resume',
        });
        if (error instanceof Error) {
          onError?.(error);
        }
      }
    })();

    // 保留已完成 promise，同 session 内合并重复 resume；切 session 由 invalidate 清空。
    inFlightRef.current = { sessionId: targetSessionId, promise };
    return promise;
  };

  return { resumeTurn, clearResumedTurn, invalidateResume };
}
