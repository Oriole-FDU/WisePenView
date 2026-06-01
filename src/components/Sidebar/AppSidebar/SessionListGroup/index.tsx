import { useChatService } from '@/domains';
import type { ChatSession } from '@/domains/Chat';
import { useChatPanelStore, useCurrentChatSessionStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { Button, Header, ListBox, ListBoxItem, ListBoxSection, toast } from '@heroui/react';
import { useMount, useRequest } from 'ahooks';
import clsx from 'clsx';
import { useCallback, useImperativeHandle, useState, type Ref } from 'react';
import styles from '../AppSessionMenu/style.module.less';
import SessionMenuItem from '../SessionMenuItem';
import type {
  SessionListGroupComponentProps,
  SessionListGroupProps,
  SessionListGroupRef,
} from './index.type';

const SESSION_PAGE_SIZE = 20;

const useSessionListGroup = ({ onActiveSessionMenuKeyChange }: SessionListGroupProps) => {
  const chatService = useChatService();
  const [sessionItems, setSessionItems] = useState<ChatSession[]>([]);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionTotalPage, setSessionTotalPage] = useState(1);
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);

  const { runAsync: runListSessions, loading: sessionListLoading } = useRequest(
    async (page: number) =>
      chatService.listSessions({
        page,
        size: SESSION_PAGE_SIZE,
      }),
    {
      manual: true,
    }
  );

  const loadSessionPage = useCallback(
    async (page: number, append: boolean) => {
      if (append) {
        setLoadingMoreSessions(true);
      }
      try {
        const payload = await runListSessions(page);
        setSessionPage(payload.page);
        setSessionTotalPage(payload.total_page || 1);
        // 始终以 store 最新 sessionId 为准，避免闭包里读到旧值后回写错误会话。
        const latestSessionId = useCurrentChatSessionStore.getState().currentSessionId;
        if (latestSessionId) {
          const currentSession = payload.list.find((item) => item.id === latestSessionId);
          if (currentSession) {
            setCurrentSession({ id: currentSession.id, title: currentSession.title });
          }
        }
        setSessionItems((prev) => {
          if (!append) {
            return payload.list;
          }
          const existingIds = new Set(prev.map((item) => item.id));
          const extra = payload.list.filter((item) => !existingIds.has(item.id));
          return [...prev, ...extra];
        });
      } catch (err) {
        toast.danger(parseErrorMessage(err));
      } finally {
        if (append) {
          setLoadingMoreSessions(false);
        }
      }
    },
    [runListSessions, setCurrentSession]
  );

  const refresh = useCallback(async () => {
    await loadSessionPage(1, false);
  }, [loadSessionPage]);

  useMount(() => {
    void refresh();
  });

  const pinnedSessions = sessionItems.filter((item) => item.is_pinned);
  const normalSessions = sessionItems.filter((item) => !item.is_pinned);
  const hasMoreSessions = sessionPage < sessionTotalPage;

  const handleDeleted = useCallback(
    (sessionId: string) => {
      if (currentSessionId === sessionId) {
        clearCurrentSession();
      }
      onActiveSessionMenuKeyChange?.(undefined);
    },
    [clearCurrentSession, currentSessionId, onActiveSessionMenuKeyChange]
  );

  const selectSession = useCallback(
    (session: ChatSession) => {
      setCurrentSession({ id: session.id, title: session.title });
      setChatPanelCollapsed(false);
    },
    [setChatPanelCollapsed, setCurrentSession]
  );

  const loadMoreSessions = useCallback(() => {
    if (loadingMoreSessions || !hasMoreSessions) return;
    void loadSessionPage(sessionPage + 1, true);
  }, [hasMoreSessions, loadSessionPage, loadingMoreSessions, sessionPage]);

  return {
    hasMoreSessions,
    handleDeleted,
    loadMoreSessions,
    loadingMoreSessions,
    normalSessions,
    pinnedSessions,
    refresh,
    selectSession,
    sessionItems,
    sessionListLoading,
  };
};

function SessionListGroup({
  ref,
  selectedKeys,
  ...listGroupProps
}: SessionListGroupComponentProps & { ref?: Ref<SessionListGroupRef> }) {
  const {
    handleDeleted,
    hasMoreSessions,
    loadMoreSessions,
    loadingMoreSessions,
    normalSessions,
    pinnedSessions,
    refresh,
    selectSession,
    sessionItems,
    sessionListLoading,
  } = useSessionListGroup(listGroupProps);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  return (
    <ListBox
      aria-label="聊天记录"
      selectionMode="single"
      className={styles.sessionMenu}
      selectedKeys={selectedKeys}
    >
      {pinnedSessions.length > 0 && (
        <ListBoxSection id="pinned-session" className={styles.section}>
          <Header className={styles.sectionTitle}>置顶会话</Header>
          {pinnedSessions.map((session) => (
            <ListBoxItem
              key={session.id}
              id={`session-${session.id}`}
              textValue={session.title || '未命名会话'}
              className={clsx(styles.sessionItem, styles.sessionItemWithActions)}
              onPress={() => selectSession(session)}
            >
              <SessionMenuItem session={session} onUpdated={refresh} onDeleted={handleDeleted} />
            </ListBoxItem>
          ))}
        </ListBoxSection>
      )}
      <ListBoxSection id="recent-session" className={styles.section}>
        <Header className={styles.sectionTitle}>聊天记录</Header>
        {sessionListLoading && sessionItems.length === 0 ? (
          <ListBoxItem
            id="session-loading"
            textValue="会话加载中..."
            isDisabled
            className={styles.sessionItem}
          >
            会话加载中...
          </ListBoxItem>
        ) : (
          <>
            {normalSessions.length === 0 ? (
              <ListBoxItem
                id="empty-normal-session"
                textValue="暂无会话"
                isDisabled
                className={styles.sessionItem}
              >
                暂无会话
              </ListBoxItem>
            ) : (
              normalSessions.map((session) => (
                <ListBoxItem
                  key={session.id}
                  id={`session-${session.id}`}
                  textValue={session.title || '未命名会话'}
                  className={clsx(styles.sessionItem, styles.sessionItemWithActions)}
                  onPress={() => selectSession(session)}
                >
                  <SessionMenuItem
                    session={session}
                    onUpdated={refresh}
                    onDeleted={handleDeleted}
                  />
                </ListBoxItem>
              ))
            )}
            {(hasMoreSessions || loadingMoreSessions) && (
              <ListBoxItem
                id="session-load-more"
                textValue={hasMoreSessions ? '加载更多' : '没有更多了'}
                isDisabled
                className={styles.sessionItem}
              >
                <Button
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
                  {hasMoreSessions ? '加载更多' : '没有更多了'}
                </Button>
              </ListBoxItem>
            )}
          </>
        )}
      </ListBoxSection>
    </ListBox>
  );
}

SessionListGroup.displayName = 'SessionListGroup';

export type { SessionListGroupRef };
export default SessionListGroup;
