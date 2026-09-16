import { toast } from '@heroui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CheckCheck, ChevronDown, ChevronUp, ExternalLink, RotateCw } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { EmptyState, ResultState, Spin } from '@/components/base/Feedback';
import { useMessageService } from '@/domains';
import type { UserMessage } from '@/domains/Message';
import { useApi, useApiInfiniteScroll } from '@/hooks/useApi';
import PageHeader from '@/layouts/_common/PageHeader';
import { cn } from '@/utils/cn';
import { parseErrorMessage } from '@/utils/error';
import { formatRelativeTimestamp, formatTimestampToDateTime } from '@/utils/format/formatTime';
import { extractMarkdownPlainText } from '@/utils/markdown/extractMarkdownPlainText';
import { buildNotificationPath } from '@/utils/navigation/appRoute';

import styles from './style.module.less';

const MESSAGE_PAGE_SIZE = 100;
const MESSAGE_ITEM_ESTIMATE_SIZE = 156;
const MESSAGE_ITEM_OVERSCAN = 8;

interface UserMessageInfinitePage {
  list: UserMessage[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

interface UserMessagePagePayload extends Omit<UserMessageInfinitePage, 'list'> {
  messages: UserMessage[];
}

const toUserMessageInfinitePage = (data: UserMessagePagePayload): UserMessageInfinitePage => {
  const { messages, ...page } = data;
  return { ...page, list: messages };
};

const resolveMessageTypeLabel = (
  message: UserMessage,
  t: ReturnType<typeof useTranslation<'message'>>['t']
) => {
  const key = message.messageType;
  if (key === 'SYSTEM' || key === 'NORMAL' || key === 'GROUP') {
    return t(`type.${key}`);
  }
  return key || t('type.NORMAL');
};

function NotificationsPage() {
  const { t, i18n } = useTranslation('message');
  const messageService = useMessageService();
  const navigate = useNavigate();
  const { messageId: routeMessageId } = useParams<{ messageId: string }>();
  const selectedMessageId = routeMessageId ? decodeURIComponent(routeMessageId) : undefined;
  const locale = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  const messageListRef = useRef<HTMLDivElement>(null);

  const messagesRequest = useApiInfiniteScroll<UserMessageInfinitePage>(
    async (current) => {
      const nextPage = Math.floor((current?.list.length ?? 0) / MESSAGE_PAGE_SIZE) + 1;
      const data = await messageService.listUserMessages({
        page: nextPage,
        size: MESSAGE_PAGE_SIZE,
      });
      return toUserMessageInfinitePage(data);
    },
    {
      target: messageListRef,
      isNoMore: (data) => Boolean(data && data.page >= data.totalPage),
      showErrorToast: false,
      onErrorEffect: (error) => toast.warning(parseErrorMessage(error)),
    }
  );

  const messages = messagesRequest.data?.list ?? [];
  const selectedMessage = messages.find((message) => message.messageId === selectedMessageId);
  const isInitialLoading = messagesRequest.loading && messagesRequest.data == null;
  const hasMoreMessages = !messagesRequest.noMore;
  // eslint-disable-next-line react-hooks/incompatible-library -- 虚拟列表需要读取滚动容器尺寸与动态行高，属于命令式测量。
  const messageVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => messageListRef.current,
    estimateSize: () => MESSAGE_ITEM_ESTIMATE_SIZE,
    overscan: MESSAGE_ITEM_OVERSCAN,
    getItemKey: (index) => messages[index]?.messageId ?? index,
  });
  const virtualItems = messageVirtualizer.getVirtualItems();
  const virtualTopPadding = virtualItems[0]?.start ?? 0;
  const virtualBottomPadding =
    virtualItems.length > 0
      ? messageVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0;

  const { runAsync: readMessages } = useApi(
    (messageIds: string[]) => messageService.readMessages({ messageIds }),
    { manual: true }
  );

  const markLoadedMessageAsRead = (messageId: string) => {
    messagesRequest.mutate((data) =>
      data
        ? {
            ...data,
            list: data.list.map((message) =>
              message.messageId === messageId ? { ...message, read: true } : message
            ),
          }
        : data
    );
  };

  const markLoadedMessagesAsRead = () => {
    messagesRequest.mutate((data) =>
      data
        ? {
            ...data,
            list: data.list.map((message) => ({ ...message, read: true })),
          }
        : data
    );
  };

  const handleRefreshMessages = () => {
    messagesRequest.reload();
  };

  const handleSelectMessage = async (message: UserMessage) => {
    navigate(buildNotificationPath(message.messageId));
    if (message.read) return;
    try {
      await readMessages([message.messageId]);
      markLoadedMessageAsRead(message.messageId);
    } catch (error: unknown) {
      toast.warning(parseErrorMessage(error));
    }
  };

  const handleToggleMessage = async (message: UserMessage) => {
    if (message.messageId === selectedMessageId) {
      navigate(buildNotificationPath());
      return;
    }
    await handleSelectMessage(message);
  };

  const handleMarkAllAsRead = async () => {
    const unreadMessages = messages.filter((message) => !message.read);
    if (unreadMessages.length === 0) return;
    try {
      await readMessages(unreadMessages.map((message) => message.messageId));
      markLoadedMessagesAsRead();
    } catch (error: unknown) {
      toast.warning(parseErrorMessage(error));
    }
  };

  const handleOpenJumpUrl = (message: UserMessage) => {
    if (!message.jumpUrl) return;
    if (/^https?:\/\//i.test(message.jumpUrl)) {
      window.open(message.jumpUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(message.jumpUrl);
  };

  const hasUnreadMessages = messages.some((message) => !message.read);

  return (
    <section className={styles.notificationCenter} aria-labelledby="notifications-title">
      <PageHeader
        titleId="notifications-title"
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        actions={
          <AppButton
            size="sm"
            variant="secondary"
            isDisabled={!hasUnreadMessages}
            onPress={handleMarkAllAsRead}
          >
            <CheckCheck size={16} />
            {t('page.markAllAsRead')}
          </AppButton>
        }
      />

      <div className={styles.pageBody}>
        {messagesRequest.error ? (
          <div className={styles.pageState}>
            <ResultState
              status="error"
              title={t('page.loadFailed')}
              subTitle={parseErrorMessage(messagesRequest.error)}
              extra={
                <AppButton variant="primary" onPress={handleRefreshMessages}>
                  <RotateCw size={16} />
                  {t('page.refresh')}
                </AppButton>
              }
            />
          </div>
        ) : isInitialLoading ? (
          <div className={styles.pageState} role="status" aria-live="polite" aria-busy="true">
            <Spin size="large" tip={t('page.loading')} />
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.pageState}>
            <EmptyState
              title={t('page.emptyTitle')}
              description={t('page.emptyDescription')}
              className={styles.emptyState}
            />
          </div>
        ) : selectedMessageId && !selectedMessage && !hasMoreMessages ? (
          <div className={styles.pageState}>
            <ResultState
              status="404"
              title={t('page.notFoundTitle')}
              subTitle={t('page.notFoundDescription')}
            />
          </div>
        ) : (
          <div className={styles.messageList} ref={messageListRef}>
            {virtualTopPadding > 0 ? (
              <div
                className={styles.virtualSpacer}
                style={{ height: virtualTopPadding }}
                aria-hidden
              />
            ) : null}
            {virtualItems.map((virtualItem) => {
              const message = messages[virtualItem.index];
              if (!message) return null;
              const isSelected = message.messageId === selectedMessageId;
              const isUnread = !message.read;
              const title = message.title || t('page.untitled');
              const preview = extractMarkdownPlainText(message.content);
              const content = extractMarkdownPlainText(message.content, {
                preserveLineBreaks: true,
              });
              const absoluteTime = formatTimestampToDateTime(message.createTime);
              const absoluteTimeShort = absoluteTime.replace(/:\d{2}$/, '');
              const relativeTime =
                formatRelativeTimestamp(message.createTime, locale) || absoluteTimeShort;
              const typeLabel = resolveMessageTypeLabel(message, t);
              const createTimeIso = message.createTime
                ? new Date(message.createTime).toISOString()
                : undefined;

              return (
                <article
                  key={message.messageId}
                  data-index={virtualItem.index}
                  ref={messageVirtualizer.measureElement}
                  className={cn(styles.messageItem, isSelected && styles.messageItemSelected)}
                >
                  <div className={styles.messageSummary}>
                    <button
                      type="button"
                      className={styles.messageOpenButton}
                      aria-expanded={isSelected}
                      onClick={() => void handleToggleMessage(message)}
                    >
                      <span className={styles.messageStatusLine}>
                        <span
                          className={cn(styles.statusDot, !isUnread && styles.statusDotRead)}
                          aria-hidden="true"
                        />
                        <span>{typeLabel}</span>
                        {!isUnread ? (
                          <span className={styles.readLabel}>{t('page.readStatus.read')}</span>
                        ) : null}
                      </span>
                      <strong className={styles.messageTitle}>{title}</strong>
                      {!isSelected && preview ? (
                        <span className={styles.messagePreview}>{preview}</span>
                      ) : null}
                    </button>

                    <div className={styles.messageAside}>
                      <time
                        className={styles.sentAt}
                        dateTime={createTimeIso}
                        title={absoluteTime || undefined}
                      >
                        {relativeTime}
                      </time>
                      <button
                        type="button"
                        className={styles.toggleDetail}
                        aria-expanded={isSelected}
                        aria-label={isSelected ? t('page.hideMessage') : t('page.showMessage')}
                        onClick={() => void handleToggleMessage(message)}
                      >
                        {isSelected ? (
                          <ChevronUp size={16} aria-hidden />
                        ) : (
                          <ChevronDown size={16} aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className={styles.messageBody}>
                      {absoluteTimeShort ? (
                        <time
                          className={styles.absoluteSentAt}
                          dateTime={createTimeIso}
                          title={absoluteTime || undefined}
                        >
                          {absoluteTimeShort}
                        </time>
                      ) : null}
                      <p className={styles.messageContent}>{content}</p>
                      {message.jumpUrl ? (
                        <div className={styles.messageActions}>
                          <AppButton
                            size="sm"
                            variant="secondary"
                            onPress={() => handleOpenJumpUrl(message)}
                          >
                            <ExternalLink size={16} />
                            {t('page.jumpLink')}
                          </AppButton>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
            {virtualBottomPadding > 0 ? (
              <div
                className={styles.virtualSpacer}
                style={{ height: virtualBottomPadding }}
                aria-hidden
              />
            ) : null}
            {hasMoreMessages ? (
              <div className={styles.loadMoreBar}>
                <AppButton
                  variant="ghost"
                  size="sm"
                  className={styles.loadMoreButton}
                  isDisabled={messagesRequest.loadingMore}
                  onPress={messagesRequest.loadMore}
                >
                  {messagesRequest.loadingMore ? t('page.loadingMore') : t('page.loadMore')}
                </AppButton>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

export default NotificationsPage;
