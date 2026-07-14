import type { Message } from '@/components/ChatPanel/index.type';
import { Spin } from '@/components/Feedback';
import {
  Marker,
  MarkerContent,
  MarkerIcon,
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScrollerScrollable,
} from '@/components/_shadcn';
import markerStyles from '@/components/_shadcn/marker.module.less';
import { useLatest, useUpdateEffect } from 'ahooks';
import { ArrowDown } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import MessageItem from './MessageItem';
import Welcome from './Welcome';
import styles from './style.module.less';

const AUTO_LOAD_EDGE_THRESHOLD = 96;

interface MessageListProps {
  messages: Message[];
  canLoadMoreHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
  /** 哪类消息作为 scrollAnchor；默认 ai */
  scrollAnchorRole?: 'user' | 'ai';
  footer?: ReactNode;
}

function MessageList({
  messages,
  canLoadMoreHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
  scrollAnchorRole = 'ai',
  footer,
}: MessageListProps) {
  return (
    <MessageScrollerProvider
      autoScroll
      defaultScrollPosition="end"
      scrollEdgeThreshold={AUTO_LOAD_EDGE_THRESHOLD}
      scrollPreviousItemPeek={72}
    >
      <MessageScroller className={styles.container}>
        <MessageScrollerViewport className={styles.viewport}>
          <MessageScrollerContent className={styles.scrollColumn}>
            <div className={styles.messagesBody}>
              {messages.length === 0 ? (
                <MessageScrollerItem className={styles.welcomeItem}>
                  <Welcome />
                </MessageScrollerItem>
              ) : (
                <>
                  <AutoLoadHistory
                    canLoadMoreHistory={canLoadMoreHistory}
                    loadingMoreHistory={loadingMoreHistory}
                    onLoadMoreHistory={onLoadMoreHistory}
                  />

                  <HistoryLoadingMarker visible={loadingMoreHistory} />

                  {messages.map((message) => (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={message.role === scrollAnchorRole}
                    >
                      <MessageItem message={message} />
                    </MessageScrollerItem>
                  ))}
                </>
              )}
            </div>

            {footer ? <div className={styles.footerSlot}>{footer}</div> : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <MessageScrollerButton className={styles.scrollToBottomButton}>
          <ArrowDown size={14} />
          <span className={styles.srOnly}>滚动到底部</span>
        </MessageScrollerButton>
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

interface AutoLoadHistoryProps {
  canLoadMoreHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
}

function AutoLoadHistory({
  canLoadMoreHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
}: AutoLoadHistoryProps) {
  const { start } = useMessageScrollerScrollable();
  const loadMoreRef = useLatest(onLoadMoreHistory);
  const pendingRef = useRef(false);

  useUpdateEffect(() => {
    if (start || !canLoadMoreHistory || loadingMoreHistory || pendingRef.current) return;

    pendingRef.current = true;
    void loadMoreRef.current().finally(() => {
      pendingRef.current = false;
    });
  }, [canLoadMoreHistory, loadingMoreHistory, start]);

  return null;
}

function HistoryLoadingMarker({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <MessageScrollerItem className={styles.loadMoreWrapper}>
      <Marker variant="separator" role="status">
        <MarkerIcon>
          <Spin size="small" />
        </MarkerIcon>
        <MarkerContent className={markerStyles.shimmer}>正在加载更早消息...</MarkerContent>
      </Marker>
    </MessageScrollerItem>
  );
}

export default MessageList;
