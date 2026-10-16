import { toast } from '@heroui/react';
import { useLatest } from 'ahooks';
import { useEffect } from 'react';

import { useChatService } from '@/domains';
import { useChatHistory, type WisePenUIMessage } from '@/domains/Chat';
import { useApi } from '@/hooks/useApi';
import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useAppAuth } from '@/layouts/App/_context';
import { parseErrorMessage } from '@/utils/error';

const HISTORY_PAGE_SIZE = 100;

interface UseChatTurnHistoryOptions {
  /** Chat 运行时写入历史消息的入口 */
  setMessages: (
    messages: WisePenUIMessage[] | ((messages: WisePenUIMessage[]) => WisePenUIMessage[])
  ) => void;
  /** 历史加载成功后接续后台 turn 的流 */
  resumeSessionStream: () => Promise<void>;
  /** 会话切换时中止旧 Chat 的客户端连接 */
  stop: () => void;
  isNewlyCreatedSession: (sessionId: string) => boolean;
  clearNewlyCreatedSession: (sessionId: string) => void;
}

/**
 * 历史域：当前会话的历史分页与会话切换时的加载、流恢复。
 *
 * 分页游标、加载态和请求版本只在这里变化；消息写入与流控制来自 Chat 运行时。
 */
export function useChatTurnHistory({
  setMessages,
  resumeSessionStream,
  stop,
  isNewlyCreatedSession,
  clearNewlyCreatedSession,
}: UseChatTurnHistoryOptions) {
  const appAuth = useAppAuth();
  const chatService = useChatService();
  const { sessionId: currentSessionId } = useChatSessionRoute();
  const routeLatest = useLatest({ sessionId: currentSessionId });

  const { runAsync: runLoadSessionHistory } = useApi(
    async (sessionId: string, page: number, size: number) =>
      chatService.listHistoryMessages({ sessionId, page, size }),
    { manual: true }
  );
  const {
    canLoadMore,
    loadingMore,
    loadingInitial,
    replaceHistory,
    prependHistory,
    clearConversation,
  } = useChatHistory({
    sessionId: currentSessionId ?? null,
    pageSize: HISTORY_PAGE_SIZE,
    loadPage: runLoadSessionHistory,
    setMessages,
  });

  const loadHistoryMessages = async (sessionId: string): Promise<boolean> => {
    try {
      return await replaceHistory(sessionId);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      clearConversation();
      return false;
    }
  };
  const historyActionsLatest = useLatest({
    clearConversation,
    loadHistoryMessages,
    resumeSessionStream,
  });

  const loadMore = async () => {
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return;
    }
    try {
      await prependHistory();
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：当前会话 ID 首次可用或发生切换时加载历史，并在历史成功后检查 active turn。
   * 不可替代原因：历史加载和 SSE 重连都是异步外部副作用，必须按顺序写入当前 Chat 运行时。
   * cleanup：标记本次会话加载失效并中止旧 Chat 的客户端连接，配合 useChatHistory 与
   * useChatSession 丢弃旧请求结果；stop 不调用后端 cancel，后台 turn 仍可被后续页面恢复。
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
      await actions.resumeSessionStream();
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
    canLoadMore,
    loadMore,
    loadingInitial,
    loadingMore,
  };
}
