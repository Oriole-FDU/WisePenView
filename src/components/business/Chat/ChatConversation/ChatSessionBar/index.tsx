import { useKeyPress } from 'ahooks';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

import { AppButton, AppPressable } from '@/components/base/Button';
import { useChatSessionService } from '@/domains';
import type { ChatSession } from '@/domains/ChatSession';
import { useApiInfiniteScroll } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';

import styles from '../../style.module.scss';

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
  const chatSessionService = useChatSessionService();
  const {
    data: sessionPage,
    state,
    loadingMore,
    noMore,
    loadMore,
    retry,
  } = useApiInfiniteScroll(
    ({ page, size }) =>
      chatSessionService.listSessions({
        page,
        size,
      }),
    {
      queryKey: ['chat-sessions'],
      pageSize: SESSION_PAGE_SIZE,
      getKey: (session) => session.id,
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
  const initialLoading = state.status === 'loading';
  const canLoadMore = Boolean(sessionPage) && !loadingMore && !noMore;

  return (
    <aside className={styles.sessionBar} aria-label={t('session.listAria')}>
      <div className={styles.sessionList}>
        {initialLoading ? (
          <div className={styles.sessionStateText}>{t('session.loading')}</div>
        ) : null}
        {state.status === 'error' ? (
          <div className={styles.sessionStateText} role="alert">
            {parseErrorMessage(state.error)}
            <AppButton size="sm" onPress={retry}>
              {t('common:actions.retry')}
            </AppButton>
          </div>
        ) : null}
        {state.status === 'empty' ? (
          <div className={styles.sessionStateText}>{t('session.empty')}</div>
        ) : null}

        {sessions.map((session) => {
          const title = session.title.trim() || t('session.untitled');
          const time = formatSessionTime(session) || t('session.noTime');
          const active = session.id === activeSessionId;

          return (
            <AppPressable
              key={session.id}
              className={clsx(styles.sessionItem, active && styles.sessionItemActive)}
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
            </AppPressable>
          );
        })}

        {canLoadMore ? (
          <AppPressable className={styles.sessionLoadMoreButton} onClick={loadMore}>
            {t('session.loadMore')}
          </AppPressable>
        ) : null}
        {loadingMore ? <div className={styles.sessionStateText}>{t('session.loading')}</div> : null}
      </div>
    </aside>
  );
}

export default ChatSessionBar;
