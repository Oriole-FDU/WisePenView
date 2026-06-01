import React, { useCallback, useRef } from 'react';
import { useMount, useUpdateEffect } from 'ahooks';
import MessageItem from './MessageItem';
import Welcome from './Welcome';
import styles from './style.module.less';
import type { Message } from '@/components/ChatPanel/index.type'; // 假设你有这个类型定义

interface MessageListProps {
  messages: Message[];
  canLoadMoreHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
  onPromptClick?: (text: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  canLoadMoreHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
  onPromptClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];

  const scrollToBottom = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, []);

  const restoreScrollPositionWithoutSmooth = useCallback(
    (element: HTMLDivElement, nextScrollTop: number) => {
      const previousScrollBehavior = element.style.scrollBehavior;
      element.style.scrollBehavior = 'auto';
      element.scrollTop = nextScrollTop;
      requestAnimationFrame(() => {
        element.style.scrollBehavior = previousScrollBehavior;
      });
    },
    []
  );

  useMount(() => {
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  });

  useUpdateEffect(() => {
    scrollToBottom();
  }, [lastMessage?.id, lastMessage?.content, scrollToBottom]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreHistory) return;
    const element = scrollRef.current;
    if (!element) {
      await onLoadMoreHistory();
      return;
    }

    const previousScrollTop = element.scrollTop;
    const previousScrollHeight = element.scrollHeight;
    await onLoadMoreHistory();

    requestAnimationFrame(() => {
      const currentElement = scrollRef.current;
      if (!currentElement) return;
      const scrollHeightDelta = currentElement.scrollHeight - previousScrollHeight;
      restoreScrollPositionWithoutSmooth(currentElement, previousScrollTop + scrollHeightDelta);
    });
  }, [loadingMoreHistory, onLoadMoreHistory, restoreScrollPositionWithoutSmooth]);

  return (
    <div className={styles.container} ref={scrollRef}>
      {messages.length === 0 ? (
        <Welcome onPromptClick={onPromptClick} />
      ) : (
        <div>
          {canLoadMoreHistory && (
            <div className={styles.loadMoreWrapper}>
              <button
                type="button"
                className={styles.loadMoreBtn}
                onClick={() => void handleLoadMore()}
                disabled={loadingMoreHistory}
              >
                {loadingMoreHistory ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageList;
