import { toast } from '@heroui/react';
import { useLatest } from 'ahooks';
import { useEffect } from 'react';

import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useAppAuth } from '@/layouts/App/_context';
import { parseErrorMessage } from '@/utils/error';

import type { UseChatHistoryResult } from './useChatHistory';

export interface UseChatTurnHistoryOptions {
  /** useChatHistory 产出的分页态与写入操作 */
  history: UseChatHistoryResult;
  /** 历史加载成功后接续后台 turn 的流 */
  resumeTurnStream: () => Promise<void>;
  /** 会话切换时中止旧 Chat 的客户端连接 */
  stop: () => void;
  isNewlyCreatedSession: (sessionId: string) => boolean;
  clearNewlyCreatedSession: (sessionId: string) => void;
}

export interface UseChatTurnHistoryResult {
  canLoadMore: boolean;
  loadMore: () => Promise<void>;
  loadingInitial: boolean;
  loadingMore: boolean;
}

/**
 * 历史生命周期：会话切换时触发 hydrate / 清空 / 流恢复。
 *
 * 分页游标与 messages 写入由 useChatHistory + useChat 负责；本模块只编排时机。
 */
export function useChatTurnHistory({
  history,
  resumeTurnStream,
  stop,
  isNewlyCreatedSession,
  clearNewlyCreatedSession,
}: UseChatTurnHistoryOptions): UseChatTurnHistoryResult {
  const appAuth = useAppAuth();
  const { sessionId: currentSessionId } = useChatSessionRoute();
  const routeLatest = useLatest({ sessionId: currentSessionId });
  const historyLatest = useLatest(history);

  const loadHistoryMessages = async (sessionId: string): Promise<boolean> => {
    try {
      return await historyLatest.current.replaceHistory(sessionId);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      historyLatest.current.clearConversation();
      return false;
    }
  };
  const historyActionsLatest = useLatest({
    clearConversation: () => historyLatest.current.clearConversation(),
    loadHistoryMessages,
    resumeTurnStream,
  });

  const loadMore = async () => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    try {
      await historyLatest.current.prependHistory();
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：当前会话 ID 首次可用或发生切换时加载历史，并在历史成功后检查 active turn。
   * 不可替代原因：历史加载和 SSE 重连都是异步外部副作用，必须按顺序写入当前 Chat 运行时。
   * cleanup：标记本次会话加载失效并中止旧 Chat 的客户端连接，配合 Runtime 丢弃旧请求结果；
   * stop 不调用后端 cancel，后台 turn 仍可被后续页面恢复。
   */
  useEffect(() => {
    const actions = historyActionsLatest.current;
    if (!appAuth.isAuthenticated) {
      actions.clearConversation();
      return;
    }
    if (!currentSessionId) {
      actions.clearConversation();
      return;
    }
    const targetSessionId = currentSessionId;
    const isNewSession = isNewlyCreatedSession(targetSessionId);
    let cancelled = false;
    void (async () => {
      if (isNewSession) return;
      const loaded = await actions.loadHistoryMessages(targetSessionId);
      if (!loaded || cancelled) return;
      if (routeLatest.current.sessionId !== targetSessionId) return;
      await actions.resumeTurnStream();
    })();
    return () => {
      cancelled = true;
      clearNewlyCreatedSession(targetSessionId);
      void stop();
    };
  }, [
    appAuth.isAuthenticated,
    clearNewlyCreatedSession,
    currentSessionId,
    historyActionsLatest,
    isNewlyCreatedSession,
    routeLatest,
    stop,
  ]);

  return {
    canLoadMore: history.canLoadMore,
    loadMore,
    loadingInitial: history.loadingInitial,
    loadingMore: history.loadingMore,
  };
}
