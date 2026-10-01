import { ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/_shadcn';

import ConversationLoading from './ConversationLoading';
import HistoryLoader from './HistoryLoader';
import type { ChatMessageListProps } from './index.type';
import Message from './Message';
import MessageHistoryNavigator from './MessageHistoryNavigator';
import StreamingScrollFollower from './StreamingScrollFollower';
import styles from './style.module.less';

const AUTO_LOAD_EDGE_THRESHOLD = 96;
const HISTORY_ANCHOR_TOP_RATIO = 1 / 3;

/** 组合消息展示与滚动交互，不拥有会话、分页请求或工具审批状态。 */
function ChatMessageList({
  messages,
  resetKey,
  generating,
  canLoadMoreHistory,
  loadingInitialHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
  model,
  fullWidth,
}: ChatMessageListProps) {
  const { t } = useTranslation('chat');
  const isEmpty = messages.length === 0;
  const showConversationLoading = isEmpty && loadingInitialHistory;

  return (
    <MessageScrollerProvider
      autoScroll
      autoScrollResetKey={resetKey}
      defaultScrollPosition="end"
      scrollAnchorOffsetRatio={HISTORY_ANCHOR_TOP_RATIO}
      scrollEdgeThreshold={AUTO_LOAD_EDGE_THRESHOLD}
      scrollPreviousItemPeek={72}
    >
      <MessageScroller className={styles.container} data-full-width={fullWidth}>
        <MessageScrollerViewport className={styles.viewport}>
          <MessageScrollerContent className={styles.scrollColumn}>
            <StreamingScrollFollower active={generating} messages={messages} />

            <div className={styles.messagesBody} data-empty={isEmpty}>
              {showConversationLoading ? (
                <MessageScrollerItem className={styles.welcomeItem}>
                  <ConversationLoading />
                </MessageScrollerItem>
              ) : isEmpty ? null : (
                <>
                  <HistoryLoader
                    canLoadMoreHistory={canLoadMoreHistory}
                    loadingMoreHistory={loadingMoreHistory}
                    onLoadMoreHistory={onLoadMoreHistory}
                  />

                  {messages.map((message) => (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={message.role === 'user'}
                    >
                      <Message
                        message={message}
                        model={model}
                        fullWidth={fullWidth}
                        streaming={message.id === messages[messages.length - 1]?.id && generating}
                      />
                    </MessageScrollerItem>
                  ))}
                </>
              )}
            </div>
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <MessageScrollerButton className={styles.scrollToBottomButton}>
          <ArrowDown size={14} />
          <span className={styles.srOnly}>{t('message.scrollToBottom')}</span>
        </MessageScrollerButton>
        <MessageHistoryNavigator
          messages={messages}
          fullWidth={fullWidth}
          scrollAnchorOffsetRatio={HISTORY_ANCHOR_TOP_RATIO}
        />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

export default ChatMessageList;
