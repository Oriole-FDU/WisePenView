import { useChatService } from '@/domains';
import type { ChatSession } from '@/domains/Chat';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useKeyPress, useMount, useRequest } from 'ahooks';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../style.module.less';

interface ChatSessionBarProps {
  activeSessionId?: string | null;
  onClose: () => void;
  onSelectSession: (session: ChatSession) => void;
}

const SESSION_PAGE_SIZE = 20;

const formatSessionTime = (session: ChatSession, locale: string): string => {
  const timestamp = session.updatedAt || session.createdAt;
  if (timestamp == null || timestamp === '') return '';
  const timestampNumber = typeof timestamp === 'number' ? timestamp : Number(timestamp);
  const date = Number.isFinite(timestampNumber)
    ? new Date(timestampNumber)
    : new Date(String(timestamp));
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

function ChatSessionBar({ activeSessionId, onClose, onSelectSession }: ChatSessionBarProps) {
  const { i18n, t } = useTranslation('chat');
  const locale = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  const chatService = useChatService();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);

  const { loading, runAsync: runListSessions } = useRequest(
    (nextPage: number) => chatService.listSessions({ page: nextPage, size: SESSION_PAGE_SIZE }),
    { manual: true }
  );

  const loadSessions = async (nextPage: number) => {
    try {
      const payload = await runListSessions(nextPage);
      setSessions((previousSessions) =>
        nextPage === 1 ? payload.list : [...previousSessions, ...payload.list]
      );
      setPage(payload.page ?? nextPage);
      setTotalPage(payload.totalPage ?? 1);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  useMount(() => {
    void loadSessions(1);
  });

  useKeyPress(
    'esc',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    },
    { events: ['keydown'], useCapture: true }
  );

  const initialLoading = loading && sessions.length === 0;
  const canLoadMore = !loading && page < totalPage;

  const handleLoadMore = () => {
    if (!canLoadMore) return;
    void loadSessions(page + 1);
  };

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
          const time = formatSessionTime(session, locale) || t('session.noTime');
          const active = session.id === activeSessionId;

          return (
            <button
              key={session.id}
              type="button"
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
            </button>
          );
        })}

        {canLoadMore ? (
          <button type="button" className={styles.sessionLoadMoreButton} onClick={handleLoadMore}>
            {t('session.loadMore')}
          </button>
        ) : null}
        {loading && sessions.length > 0 ? (
          <div className={styles.sessionStateText}>{t('session.loading')}</div>
        ) : null}
      </div>
    </aside>
  );
}

export default ChatSessionBar;
