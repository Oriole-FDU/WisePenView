import type { ChatStatus } from 'ai';
import { ArrowDown } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from '@/components/_shadcn';
import type { ChatModel, WisePenUIMessage } from '@/domains/Chat';

import ConversationLoading from './ConversationLoading';
import HistoryLoader from './HistoryLoader';
import Message from './Message';
import MessageHistoryNavigator from './MessageHistoryNavigator';
import styles from './style.module.less';

const AUTO_LOAD_EDGE_THRESHOLD = 96;
const HISTORY_ANCHOR_TOP_RATIO = 1 / 3;

interface MessageListProps {
  messages: WisePenUIMessage[];
  sessionId?: string;
  canLoadMoreHistory: boolean;
  loadingInitialHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
  status: ChatStatus;
  model: ChatModel | null;
  fullWidth: boolean;
  approvalDecisions: Readonly<Record<string, boolean>>;
  approvalSubmitting: boolean;
  onApprovalDecision: (toolCallId: string, approved: boolean) => void;
}

function MessageList({
  messages,
  sessionId,
  canLoadMoreHistory,
  loadingInitialHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
  status,
  model,
  fullWidth,
  approvalDecisions,
  approvalSubmitting,
  onApprovalDecision,
}: MessageListProps) {
  const { t } = useTranslation('chat');
  const isGenerating = status === 'submitted' || status === 'streaming';
  const showConversationLoading = messages.length === 0 && loadingInitialHistory;

  return (
    <MessageScrollerProvider
      autoScroll
      autoScrollResetKey={sessionId}
      defaultScrollPosition="end"
      scrollAnchorOffsetRatio={HISTORY_ANCHOR_TOP_RATIO}
      scrollEdgeThreshold={AUTO_LOAD_EDGE_THRESHOLD}
      scrollPreviousItemPeek={72}
    >
      <MessageScroller className={styles.container}>
        <MessageScrollerViewport className={styles.viewport}>
          <MessageScrollerContent className={styles.scrollColumn}>
            <StreamingScrollFollower active={isGenerating} messages={messages} />

            <div className={styles.messagesBody} data-empty={messages.length === 0}>
              {showConversationLoading ? (
                <MessageScrollerItem className={styles.welcomeItem}>
                  <ConversationLoading />
                </MessageScrollerItem>
              ) : messages.length === 0 ? null : (
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
                        streaming={message.id === messages[messages.length - 1]?.id && isGenerating}
                        approvalDecisions={approvalDecisions}
                        approvalSubmitting={approvalSubmitting}
                        onApprovalDecision={onApprovalDecision}
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
          scrollAnchorOffsetRatio={HISTORY_ANCHOR_TOP_RATIO}
        />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

interface StreamingScrollFollowerProps {
  active: boolean;
  messages: WisePenUIMessage[];
}

function StreamingScrollFollower({ active, messages }: StreamingScrollFollowerProps) {
  const { scrollToEnd, scrollToEndUnlessUserInterrupted } = useMessageScroller();
  const wasActiveRef = useRef(false);

  /**
   * @wisepen-manual-effect
   * 执行时机：流式消息开始或内容更新后校正消息滚动锚点。
   * 不可替代原因：消息高度和用户滚动中断状态由外部 MessageScroller 的 DOM 运行时维护。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    const started = active && !wasActiveRef.current;
    wasActiveRef.current = active;

    if (!active) return;

    if (started) {
      scrollToEnd({ behavior: 'auto' });
      return;
    }

    scrollToEndUnlessUserInterrupted();
  }, [active, messages, scrollToEnd, scrollToEndUnlessUserInterrupted]);

  return null;
}

export default MessageList;
