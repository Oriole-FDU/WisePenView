import type { Message } from '@/components/ChatPanel/index.type';
import { Spin } from '@/components/Feedback';
import ProviderLogo from '@/components/Icons/ProviderLogo';
import { Button, toast } from '@heroui/react';
import { useInterval } from 'ahooks';
import clsx from 'clsx';
import { Check, Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import inputStyles from '../../ChatInput/style.module.less';
import styles from './AiMessage.module.less';
import MessageContent from './MessageContent';
import ThinkingBlock from './ThinkingBlock';
import ToolCallBlock from './ToolCallBlock';

const LOADING_HINTS = ['正在生成回复...', '请稍等片刻...', '正在组织答案...'];
const LOADING_HINT_SWITCH_MS = 2000;
const MESSAGE_ACTION_ICON_SIZE = 17;

function AiMessage({ message }: { message: Message }) {
  const hasReasoning = message.reasoningContent !== undefined;
  const showLoadingIndicator = Boolean(message.loading && !message.content);
  const [copied, setCopied] = useState(false);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);
  const displayProvider = message.meta?.provider || 'openai';
  const displayModelName = message.meta?.modelName || message.meta?.modelId || 'AI 助手';

  useInterval(
    () => {
      setLoadingHintIndex((prev) => (prev + 1) % LOADING_HINTS.length);
    },
    showLoadingIndicator ? LOADING_HINT_SWITCH_MS : undefined
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || '');
      toast.success('复制成功');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.danger('复制失败');
    }
  };

  return (
    <div className={styles.aiRow}>
      <div className={styles.contentCol}>
        <div className={styles.modelMeta}>
          <ProviderLogo provider={displayProvider} size={16} className={styles.modelLogo} />
          <span className={styles.modelName}>{displayModelName}</span>
        </div>
        {/* 思考过程块 */}
        {hasReasoning && (
          <ThinkingBlock
            content={message.reasoningContent || ''}
            duration={message.meta?.usage?.totalTime}
            // 如果消息还在 loading 且正文没开始，说明正在思考中
            loading={message.loading && !message.content}
          />
        )}
        <ToolCallBlock
          content={message.toolContent || ''}
          loading={Boolean(message.loading && !message.content && !message.reasoningContent)}
        />
        {showLoadingIndicator && (
          <span className={styles.loadingHint}>
            <span className={styles.loadingHintIcon} aria-hidden="true">
              <Spin size="small" />
            </span>
            <span key={loadingHintIndex} className={styles.loadingHintText}>
              {LOADING_HINTS[loadingHintIndex]}
            </span>
          </span>
        )}
        {/* 正文内容 */}
        {(message.content || (!hasReasoning && !showLoadingIndicator)) && (
          <div className={styles.bubble}>
            <MessageContent content={message.content} renderAsMarkdown />
          </div>
        )}

        {/* 底部操作栏 (非 Loading 时显示) */}
        {!message.loading && (
          <div className={styles.actions}>
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              className={clsx(
                inputStyles.toolbarCircleBtn,
                styles.actionBtn,
                copied && styles.actionBtnCopied
              )}
              onPress={handleCopy}
              aria-label="复制"
            >
              {copied ? (
                <Check size={MESSAGE_ACTION_ICON_SIZE} />
              ) : (
                <Copy size={MESSAGE_ACTION_ICON_SIZE} />
              )}
            </Button>
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              className={clsx(inputStyles.toolbarCircleBtn, styles.actionBtn)}
              aria-label="点赞"
            >
              <ThumbsUp size={MESSAGE_ACTION_ICON_SIZE} />
            </Button>
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              className={clsx(inputStyles.toolbarCircleBtn, styles.actionBtn)}
              aria-label="点踩"
            >
              <ThumbsDown size={MESSAGE_ACTION_ICON_SIZE} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AiMessage;
