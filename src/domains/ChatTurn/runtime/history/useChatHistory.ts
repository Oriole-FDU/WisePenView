import { toast } from '@heroui/react';
import { useLatest } from 'ahooks';
import { useEffect } from 'react';

import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useAppAuth } from '@/layouts/App/_context';
import { parseErrorMessage } from '@/utils/error';

import type { ChatMessagesWriter } from '../message/useChatMessage';
import { useHistoryData } from './useHistoryData';
import { useHistoryLoadingFsm } from './useHistoryLoadingFsm';

export interface UseChatHistoryOptions {
  sessionId: string | null;
  /** 由 Runtime 从 useChatMessage 注入的写端口。 */
  setMessages: ChatMessagesWriter;
  resumeTurnStream: () => Promise<void>;
  stop: () => void;
  isNewlyCreatedSession: (sessionId: string) => boolean;
  clearNewlyCreatedSession: (sessionId: string) => void;
}

export interface UseChatHistoryResult {
  canLoadMore: boolean;
  loadMore: () => Promise<void>;
  loadingInitial: boolean;
  loadingMore: boolean;
}

/**
 * History 内聚入口：fsm + data + 会话切换生命周期。
 *
 * 对外只暴露分页态与 loadMore；setMessages / loading 动作不泄漏到 Runtime 组装根。
 */
export function useChatHistory({
  sessionId,
  setMessages,
  resumeTurnStream,
  stop,
  isNewlyCreatedSession,
  clearNewlyCreatedSession,
}: UseChatHistoryOptions): UseChatHistoryResult {
  const loading = useHistoryLoadingFsm();
  const data = useHistoryData({
    sessionId,
    setMessages,
    loading,
  });

  const appAuth = useAppAuth();
  const { sessionId: currentSessionId } = useChatSessionRoute();
  const routeLatest = useLatest({ sessionId: currentSessionId });
  const dataLatest = useLatest(data);

  const loadHistoryMessages = async (targetSessionId: string): Promise<boolean> => {
    try {
      return await dataLatest.current.replaceHistory(targetSessionId);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      dataLatest.current.clearConversation();
      return false;
    }
  };
  const historyActionsLatest = useLatest({
    clearConversation: () => dataLatest.current.clearConversation(),
    loadHistoryMessages,
    resumeTurnStream,
  });

  const loadMore = async () => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    try {
      await dataLatest.current.prependHistory();
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：当前会话 ID 首次可用或发生切换时加载历史，并在历史成功后检查 active turn。
   * 不可替代原因：历史加载和 SSE 重连都是异步外部副作用，必须按顺序写入当前 Chat 运行时。
   * cleanup：标记本次会话加载失效；调用方注入的 stop（Runtime.releaseSession）中止旧泵并 invalidate resume；
   * 不调用后端 cancel，后台 turn 仍可被后续页面恢复。
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
    canLoadMore: data.canLoadMore,
    loadMore,
    loadingInitial: loading.loadingInitial,
    loadingMore: loading.loadingMore,
  };
}
