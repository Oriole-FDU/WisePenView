import type { Model } from '@/components/ChatPanel/index.type';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from '@/components/_shadcn';
import type { WisePenUIMessage } from '@/domains/Chat';
import { useEffectForce } from '@/hooks/useEffectForce';
import type { ChatStatus } from 'ai';
import { ArrowDown } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import HistoryLoader from './HistoryLoader';
import Message from './Message';
import MessageHistoryNavigator from './MessageHistoryNavigator';
import Welcome from './Welcome';
import styles from './style.module.less';

const AUTO_LOAD_EDGE_THRESHOLD = 96;

interface MessageListProps {
  messages: WisePenUIMessage[];
  sessionId?: string;
  canLoadMoreHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
  status: ChatStatus;
  model: Model | null;
  fullWidth?: boolean;
  footer?: ReactNode;
}

function MessageList({
  messages,
  sessionId,
  canLoadMoreHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
  status,
  model,
  fullWidth = false,
  footer,
}: MessageListProps) {
  return (
    <MessageScrollerProvider
      autoScroll
      autoScrollResetKey={sessionId}
      defaultScrollPosition="end"
      scrollEdgeThreshold={AUTO_LOAD_EDGE_THRESHOLD}
      scrollPreviousItemPeek={72}
    >
      <MessageListContent
        messages={messages}
        canLoadMoreHistory={canLoadMoreHistory}
        loadingMoreHistory={loadingMoreHistory}
        onLoadMoreHistory={onLoadMoreHistory}
        status={status}
        model={model}
        fullWidth={fullWidth}
        footer={footer}
      />
    </MessageScrollerProvider>
  );
}

function MessageListContent({
  messages,
  canLoadMoreHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
  status,
  model,
  fullWidth = false,
  footer,
}: MessageListProps) {
  const isGenerating = status === 'submitted' || status === 'streaming';

  return (
    <MessageScroller className={styles.container}>
      <MessageScrollerViewport className={styles.viewport}>
        <MessageScrollerContent className={styles.scrollColumn}>
          <StreamingScrollFollower active={isGenerating} messages={messages} />

          <div className={styles.messagesBody}>
            {messages.length === 0 ? (
              <MessageScrollerItem className={styles.welcomeItem}>
                <Welcome />
              </MessageScrollerItem>
            ) : (
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
                    />
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
      <MessageHistoryNavigator messages={messages} />
    </MessageScroller>
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
   * 流式 Markdown 会在子组件 effect 中再次提交，外层 ResizeObserver 可能错过该帧的高度变化。
   * 每次流消息更新后于下一帧校正到底部；仅在用户仍停留于底部时执行，避免覆盖阅读位置。
   * 生成刚开始时强制 scrollToEnd，退出 user scrollAnchor 带来的 anchored-to-message，
   * 否则内容增高会反复 reanchor 到用户气泡顶部，看不到最新 AI 输出。
   */
  useEffectForce(() => {
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
