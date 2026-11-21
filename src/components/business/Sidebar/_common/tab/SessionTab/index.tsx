import { ListBoxSection } from '@heroui/react';
import { useMemoizedFn } from 'ahooks';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import ListBox, { ListBoxItem } from '@/components/base/ListBox';
import { useChatSessionService } from '@/domains';
import type { PageResult } from '@/domains/_shared/entity/page';
import type { ChatSession } from '@/domains/ChatSession';
import { useApiInfiniteScroll } from '@/hooks/useApi';
import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useChatSessionHistoryRefreshStore } from '@/layouts/AppLayout/_store/useChatSessionHistoryRefreshStore';
import { buildChatPath } from '@/utils/navigation/appRoute';

import { useSidebarSessionHistoryStore } from './_store/useSidebarSessionHistoryStore';
import SessionMenuItem from './SessionMenuItem';
import styles from './style.module.scss';

const SESSION_PAGE_SIZE = 20;

const useSessionTab = () => {
  const chatSessionService = useChatSessionService();
  const { sessionId: currentSessionId, selectSession: selectRouteSession } = useChatSessionRoute();
  const sessionItems = useSidebarSessionHistoryStore((state) => state.sessionItems);
  const setSessionPageResult = useSidebarSessionHistoryStore((state) => state.setSessionPageResult);
  const removeSession = useSidebarSessionHistoryStore((state) => state.removeSession);
  const refreshVersion = useChatSessionHistoryRefreshStore((state) => state.refreshVersion);
  const navigate = useNavigate();

  const {
    data: sessionPageData,
    loading: sessionListLoading,
    loadingMore: loadingMoreSessions,
    noMore: noMoreSessions,
    loadMore: loadMoreSessions,
    reloadAsync: reloadSessions,
  } = useApiInfiniteScroll<PageResult<ChatSession>>(
    async (current) =>
      chatSessionService.listSessions({
        page: Math.floor((current?.list.length ?? 0) / SESSION_PAGE_SIZE) + 1,
        size: SESSION_PAGE_SIZE,
      }),
    {
      reloadDeps: [refreshVersion],
      isNoMore: (data) => Boolean(data && (data.total === 0 || data.list.length >= data.total)),
      onSuccess: (payload) => {
        setSessionPageResult(payload, payload.page > 1);
      },
    }
  );

  const refresh = useMemoizedFn(async () => {
    await reloadSessions();
  });

  const hasMoreSessions = Boolean(sessionPageData) && !noMoreSessions;

  const handleDeleted = useMemoizedFn((sessionId: string) => {
    if (currentSessionId === sessionId) {
      void selectRouteSession(undefined, true);
    }
    removeSession(sessionId);
  });

  const selectSession = (session: ChatSession) => {
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
    currentSessionId,
  };
};

function SessionTab() {
  const { t } = useTranslation('chat');
  const {
    handleDeleted,
    hasMoreSessions,
    loadMoreSessions,
    loadingMoreSessions,
    refresh,
    selectSession,
    sessionItems,
    sessionListLoading,
    currentSessionId,
  } = useSessionTab();
  const selectedKeys = currentSessionId ? [`session-${currentSessionId}`] : [];

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
                className={clsx(styles.sessionItem, styles.sessionItemWithActions)}
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
