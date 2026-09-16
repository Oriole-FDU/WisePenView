import { ListBox, ListBoxItem, ListBoxSection } from '@heroui/react';
import { useInfiniteScroll, useMemoizedFn } from 'ahooks';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { useChatSessionHistoryRefreshStore } from '@/components/business/ChatPanel/_store/useChatSessionHistoryRefreshStore';
import { useCurrentChatSessionStore } from '@/components/business/ChatPanel/_store/useCurrentChatSessionStore';
import { useNewChatSessionStore } from '@/components/business/ChatPanel/_store/useNewChatSessionStore';
import { useChatService } from '@/domains';
import type { ChatSession, PageResult } from '@/domains/Chat';
import { cn } from '@/utils/cn';
import { buildChatPath } from '@/utils/navigation/appRoute';

import { useSidebarSessionHistoryStore } from './_store/useSidebarSessionHistoryStore';
import SessionMenuItem from './SessionMenuItem';
import styles from './style.module.less';

const SESSION_PAGE_SIZE = 20;

const useSessionTab = () => {
  const chatService = useChatService();
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const sessionItems = useSidebarSessionHistoryStore((state) => state.sessionItems);
  const setSessionPageResult = useSidebarSessionHistoryStore((state) => state.setSessionPageResult);
  const removeSession = useSidebarSessionHistoryStore((state) => state.removeSession);
  const navigate = useNavigate();

  const {
    data: sessionPageData,
    loading: sessionListLoading,
    loadingMore: loadingMoreSessions,
    noMore: noMoreSessions,
    loadMore: loadMoreSessions,
    reloadAsync: reloadSessions,
  } = useInfiniteScroll<PageResult<ChatSession>>(
    async (current) =>
      chatService.listSessions({
        page: Math.floor((current?.list.length ?? 0) / SESSION_PAGE_SIZE) + 1,
        size: SESSION_PAGE_SIZE,
      }),
    {
      manual: true,
      isNoMore: (data) => Boolean(data && (data.total === 0 || data.list.length >= data.total)),
      onSuccess: (payload) => {
        // 始终以 store 最新 sessionId 为准，避免闭包里读到旧值后回写错误会话。
        const latestSessionId = useCurrentChatSessionStore.getState().currentSessionId;
        if (latestSessionId) {
          const currentSession = payload.list.find((item) => item.id === latestSessionId);
          if (currentSession) {
            setCurrentSession({ id: currentSession.id, title: currentSession.title });
          }
        }
        setSessionPageResult(payload, payload.page > 1);
      },
    }
  );

  const refresh = useMemoizedFn(async () => {
    await reloadSessions();
  });

  const hasMoreSessions = Boolean(sessionPageData) && !noMoreSessions;

  const handleDeleted = (sessionId: string) => {
    if (currentSessionId === sessionId) {
      clearCurrentSession();
    }
    removeSession(sessionId);
    useNewChatSessionStore.getState().clearNewChatSessionById(sessionId);
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSession({ id: session.id, title: session.title });
    navigate(buildChatPath(session.id));
  };

  return {
    hasMoreSessions,
    handleDeleted,
    loadMoreSessions,
    loadingMoreSessions,
    refresh,
    selectSession,
    sessionItems,
    sessionListLoading,
  };
};

function SessionTab() {
  const { t } = useTranslation('chat');
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const refreshVersion = useChatSessionHistoryRefreshStore((state) => state.refreshVersion);
  const {
    handleDeleted,
    hasMoreSessions,
    loadMoreSessions,
    loadingMoreSessions,
    refresh,
    selectSession,
    sessionItems,
    sessionListLoading,
  } = useSessionTab();
  const selectedKeys = currentSessionId ? [`session-${currentSessionId}`] : [];

  /**
   * @wisepen-manual-effect
   * 执行时机：组件挂载或外部刷新版本递增时重新加载会话列表。
   * 不可替代原因：列表数据来自服务端，刷新版本是父组件可声明的同步信号。
   * cleanup：请求由 ahooks 管理，无额外订阅需要清理。
   */
  useEffect(() => {
    void refresh();
  }, [refresh, refreshVersion]);

  if (!sessionListLoading && sessionItems.length === 0) {
    return <div className={styles.sessionEmptyState}>{t('session.empty')}</div>;
  }

  return (
    <ListBox
      aria-label={t('session.listAria')}
      selectionMode="single"
      className={styles.sessionMenu}
      selectedKeys={selectedKeys}
    >
      <ListBoxSection id="recent-session" className={styles.sessionSection}>
        {sessionListLoading && sessionItems.length === 0 ? (
          <ListBoxItem
            key="session-loading"
            id="session-loading"
            textValue={t('session.loading')}
            isDisabled
            className={styles.sessionItem}
          >
            {t('session.loading')}
          </ListBoxItem>
        ) : (
          <>
            {sessionItems.map((session) => (
              <ListBoxItem
                key={session.id}
                id={`session-${session.id}`}
                textValue={session.title || t('session.untitled')}
                className={cn(styles.sessionItem, styles.sessionItemWithActions)}
                onPress={() => selectSession(session)}
              >
                <SessionMenuItem session={session} onUpdated={refresh} onDeleted={handleDeleted} />
              </ListBoxItem>
            ))}
            {(hasMoreSessions || loadingMoreSessions) && (
              <ListBoxItem
                key="session-load-more"
                id="session-load-more"
                textValue={hasMoreSessions ? t('session.loadMore') : t('session.noMore')}
                className={styles.sessionItem}
              >
                <AppButton
                  variant="secondary"
                  isDisabled={loadingMoreSessions}
                  className={styles.sessionLoadMoreBtn}
                  onPress={() => {
                    loadMoreSessions();
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  {hasMoreSessions ? t('session.loadMore') : t('session.noMore')}
                </AppButton>
              </ListBoxItem>
            )}
          </>
        )}
      </ListBoxSection>
    </ListBox>
  );
}

SessionTab.displayName = 'SessionTab';

export default SessionTab;
