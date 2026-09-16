import { useInfiniteScroll, useKeyPress } from 'ahooks';
import { useTranslation } from 'react-i18next';

import { useChatService } from '@/domains';
import type { ChatSession, PageResult } from '@/domains/Chat';
import { cn } from '@/utils/cn';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';

import styles from '../style.module.less';

interface ChatSessionBarProps {
  activeSessionId?: string | null;
  onClose: () => void;
  onSelectSession: (session: ChatSession) => void;
}

const SESSION_PAGE_SIZE = 20;

const formatSessionTime = (session: ChatSession): string => {
  const timestamp = session.updatedAt || session.createdAt;
  return formatTimestampToDateTime(timestamp);
};

function ChatSessionBar({ activeSessionId, onClose, onSelectSession }: ChatSessionBarProps) {
  const { t } = useTranslation('chat');
  const chatService = useChatService();
  const {
    data: sessionPage,
    loading,
    loadingMore,
    noMore,
    loadMore,
  } = useInfiniteScroll<PageResult<ChatSession>>(
    (current) =>
      chatService.listSessions({
        page: Math.floor((current?.list.length ?? 0) / SESSION_PAGE_SIZE) + 1,
        size: SESSION_PAGE_SIZE,
      }),
    {
      isNoMore: (data) => Boolean(data && (data.total === 0 || data.list.length >= data.total)),
    }
  );

  useKeyPress(
    'esc',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    },
    { events: ['keydown'], useCapture: true }
  );

  const sessions = sessionPage?.list ?? [];
  const initialLoading = loading && sessions.length === 0;
  const canLoadMore = Boolean(sessionPage) && !loadingMore && !noMore;

  return (
    <aside className={styles.sessionBar} aria-label={t('session.listAria')}>
      <div className={styles.sessionList}>
        {initialLoading ? (
          <div className={styles.sessionStateText}>{t('session.loading')}</div>
        ) : null}
        {!initialLoading && sessions.length === 0 ? (
          <div className={styles.sessionStateText}>{t('session.empty')}</div>
        ) : null}

        {sessions.map((session) => {
          const title = session.title.trim() || t('session.untitled');
          const time = formatSessionTime(session) || t('session.noTime');
          const active = session.id === activeSessionId;

          return (
            <button
              key={session.id}
              type="button"
              className={cn(styles.sessionItem, active && styles.sessionItemActive)}
              onClick={() => onSelectSession(session)}
              aria-current={active ? 'page' : undefined}
            >
              <span className={styles.sessionStatusDot} aria-hidden="true" />
              <span className={styles.sessionItemContent}>
                <span className={styles.sessionItemTitle} title={title}>
                  {title}
                </span>
                <span className={styles.sessionItemMeta}>{time}</span>
              </span>
            </button>
          );
        })}

        {canLoadMore ? (
          <button type="button" className={styles.sessionLoadMoreButton} onClick={loadMore}>
            {t('session.loadMore')}
          </button>
        ) : null}
        {loadingMore ? <div className={styles.sessionStateText}>{t('session.loading')}</div> : null}
      </div>
    </aside>
  );
}

export default ChatSessionBar;
