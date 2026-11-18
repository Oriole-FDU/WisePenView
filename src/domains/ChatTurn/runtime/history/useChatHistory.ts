import { useLatest } from 'ahooks';
import { useEffect } from 'react';

import type { ChatMessagesWriter } from '../message/useChatMessage';
import { useHistoryData } from './useHistoryData';
import { useHistoryLoadingFsm } from './useHistoryLoadingFsm';

export interface UseChatHistoryOptions {
  sessionId: string | null;
  isNewSession: boolean;
  setMessages: ChatMessagesWriter;
  resumeTurn: () => Promise<void>;
  stop: () => void;
  onError?: (error: Error) => void;
}

export interface UseChatHistoryResult {
  canLoadMore: boolean;
  loadMore: () => Promise<void>;
  loadingInitial: boolean;
  loadingMore: boolean;
}

export function useChatHistory({
  sessionId,
  isNewSession,
  setMessages,
  resumeTurn,
  stop,
  onError,
}: UseChatHistoryOptions): UseChatHistoryResult {
  const loading = useHistoryLoadingFsm();
  const data = useHistoryData({
    sessionId,
    setMessages,
    loading,
  });

  const sessionLatest = useLatest(sessionId);
  const dataLatest = useLatest(data);
  const onErrorLatest = useLatest(onError);

  const reportError = (error: unknown) => {
    if (error instanceof Error) onErrorLatest.current?.(error);
  };

  const loadHistoryMessages = async (targetSessionId: string): Promise<boolean> => {
    try {
      return await dataLatest.current.replaceHistory(targetSessionId);
    } catch (error) {
      reportError(error);
      dataLatest.current.clearConversation();
      return false;
    }
  };

  const historyActionsLatest = useLatest({
    clearConversation: () => dataLatest.current.clearConversation(),
    loadHistoryMessages,
    resumeTurn,
  });

  const loadMore = async () => {
    try {
      await dataLatest.current.prependHistory();
    } catch (error) {
      reportError(error);
    }
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：sessionId 首次可用或切换时加载历史；isNewSession 时跳过首载。
   * 不可替代原因：历史加载与 SSE resume 均为异步外部副作用，须按顺序写入当前 Chat 运行时。
   * cleanup：标记本次加载失效；调用方注入的 stop（Runtime.releaseSession）中止旧泵并 invalidate resume；
   * 不调用后端 cancel，后台 turn 仍可被后续页面恢复。
   */
  useEffect(() => {
    const actions = historyActionsLatest.current;
    if (!sessionId) {
      actions.clearConversation();
      return;
    }
    const targetSessionId = sessionId;
    let cancelled = false;
    void (async () => {
      if (isNewSession) return;
      const loaded = await actions.loadHistoryMessages(targetSessionId);
      if (!loaded || cancelled) return;
      if (sessionLatest.current !== targetSessionId) return;
      await actions.resumeTurn();
    })();
    return () => {
      cancelled = true;
      void stop();
    };
  }, [historyActionsLatest, isNewSession, sessionId, sessionLatest, stop]);

  return {
    canLoadMore: data.canLoadMore,
    loadMore,
    loadingInitial: loading.loadingInitial,
    loadingMore: loading.loadingMore,
  };
}
