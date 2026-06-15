import type { Message } from '@/components/ChatPanel/index.type';
import { Spin } from '@/components/Common/Feedback';
import IconText from '@/components/Common/IconText';
import { Button, toast } from '@heroui/react';
import { useInterval } from 'ahooks';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { LogoFactory } from '../../ModelSelector';
import styles from './AiMessage.module.less';
import MessageContent from './MessageContent';
import ThinkingBlock from './ThinkingBlock';
import ToolCallBlock from './ToolCallBlock';

const LOADING_HINTS = ['正在生成回复...', '请稍等片刻...', '正在组织答案...'];
const LOADING_HINT_SWITCH_MS = 2000;

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
      {/* 头像 */}
      <div className={styles.avatarCol}>
        <LogoFactory provider={displayProvider} size={28} />
      </div>

      {/* 内容 */}
      <div className={styles.contentCol}>
        <div className={styles.modelMeta}>
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
        <ToolCallBlock content={message.toolContent || ''} />
        {showLoadingIndicator && (
          <IconText
            className={styles.loadingHint}
            textClassName={styles.loadingHintText}
            icon={<Spin size="small" />}
            iconSize={14}
            gap="var(--space-xs)"
          >
            <span key={loadingHintIndex}>{LOADING_HINTS[loadingHintIndex]}</span>
          </IconText>
        )}
        {/* 正文内容 */}
        {/* 只有当正文有内容，或者没有思考过程且非 loading 时（避免空白占位），才渲染正文 */}
        {(message.content || (!hasReasoning && !showLoadingIndicator)) && (
          <div className={styles.bubble}>
            <MessageContent content={message.content} renderAsMarkdown />
          </div>
        )}

        {/* 底部操作栏 (非 Loading 时显示) */}
        {!message.loading && (
          <div className={styles.actions}>
            {/* 系统当前不支持点赞、点踩、重新生成 */}
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              className={`${styles.actionBtn} ${copied ? styles.actionBtnCopied : ''}`}
              onPress={handleCopy}
              aria-label="复制"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AiMessage;
