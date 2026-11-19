/**
 * 按会话恢复未完成 turn：合并并发请求、支持取消并防陈旧写入。
 */
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
  cancelResume: () => void;
}

export function useConnectResume({
  sessionId,
  connect,
  pumpResume,
  onError,
}: UseConnectResumeOptions): UseConnectResumeResult {
  const { getActiveTurnId, reconnectChatStream } = useChatTurnService();
  const inFlightRef = useRef<{
    sessionId: string;
    promise: Promise<void>;
    controller: AbortController;
  } | null>(null);
  const resumeEpochRef = useRef(0);
  const latestSessionId = useLatest(sessionId);

  const cancelResume = () => {
    resumeEpochRef.current += 1;
    const inFlight = inFlightRef.current;
    inFlightRef.current = null;
    inFlight?.controller.abort();
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
    const controller = new AbortController();
    const promise = (async () => {
      const epoch = resumeEpochRef.current;
      const isStale = () =>
        resumeEpochRef.current !== epoch ||
        latestSessionId.current !== targetSessionId ||
        controller.signal.aborted;

      connect.beginConnect();
      try {
        // 查询活跃 turn；无则回 idle
        const turnId = await getActiveTurnId(targetSessionId, controller.signal);
        if (isStale()) return;
        if (!turnId) {
          connect.markIdle();
          return;
        }

        // 重连并泵入；成功后若仍 open 则回 idle
        const response = await reconnectChatStream(targetSessionId, controller.signal);
        if (isStale()) {
          void response.body?.cancel();
          return;
        }

        connect.markOpen();
        await pumpResume({ response });
        if (isStale()) return;
        connect.markIdleIfOpen();
      } catch (error) {
        // 陈旧错误忽略；否则关连接并上报
        if (isStale()) return;
        connect.markClosed();
        captureException(error, {
          detector: 'application-handled',
          operation: 'chat.resume',
        });
        if (error instanceof Error) {
          onError?.(error);
        }
      } finally {
        if (inFlightRef.current?.controller === controller) {
          inFlightRef.current = null;
        }
      }
    })();

    // 只合并并发 resume；完成或取消后必须允许同一 turn 在审批后再次接流
    inFlightRef.current = { sessionId: targetSessionId, promise, controller };
    return promise;
  };

  return { resumeTurn, cancelResume };
}
