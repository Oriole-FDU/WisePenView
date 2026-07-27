import { useMessageScroller } from '@/components/_shadcn';
import { Button } from '@heroui/react';
import { Brain, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ReasoningBlock.module.less';
import { useCollapseHeight } from './useCollapseHeight';

interface ReasoningBlockProps {
  content: string;
  loading: boolean;
  durationSeconds?: number;
  /** 流式结束后是否自动收起，默认 true */
  autoCollapseOnFinish?: boolean;
}

function ReasoningBlock({
  content,
  loading,
  durationSeconds,
  autoCollapseOnFinish = true,
}: ReasoningBlockProps) {
  const { t } = useTranslation('chat');
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const [localDurationSeconds, setLocalDurationSeconds] = useState<number | undefined>(
    durationSeconds
  );
  const previousLoadingRef = useRef(loading);
  const startedAtRef = useRef<number | null>(null);
  const { scrollToEndUnlessUserInterrupted } = useMessageScroller();
  const isExpanded = loading || (userExpanded ?? !autoCollapseOnFinish);
  const displayDuration = durationSeconds ?? localDurationSeconds;
  const collapseRef = useCollapseHeight(isExpanded);
  const panelId = useId();
  let label = t('message.reasoning.title');
  if (loading) {
    label = t('message.reasoning.loading');
  } else if (displayDuration != null && displayDuration >= 0) {
    label = t('message.reasoning.duration', { count: displayDuration });
  }

  /**
   * @wisepen-manual-effect
   * 执行时机：推理流开始或结束时记录耗时并校正消息滚动位置。
   * 不可替代原因：流状态来自外部消息运行时，耗时依赖时钟，滚动器也是命令式外部对象。
   * cleanup：取消尚未写入耗时状态的 animation frame。
   */
  useEffect(() => {
    const wasLoading = previousLoadingRef.current;
    previousLoadingRef.current = loading;

    if (loading) {
      if (startedAtRef.current == null) startedAtRef.current = Date.now();
      return;
    }

    if (wasLoading && !loading) {
      let durationFrame: number | null = null;
      if (startedAtRef.current != null) {
        const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        startedAtRef.current = null;
        durationFrame = window.requestAnimationFrame(() => {
          setLocalDurationSeconds(elapsedSeconds);
        });
      }
      scrollToEndUnlessUserInterrupted();
      return () => {
        if (durationFrame !== null) window.cancelAnimationFrame(durationFrame);
      };
    }
  }, [loading, scrollToEndUnlessUserInterrupted]);

  if (!content && !loading) return null;

  return (
    <div className={styles.wrapper}>
      <Button
        variant="ghost"
        size="sm"
        className={styles.header}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onPress={() => {
          if (!loading) {
            setUserExpanded((current) => !(current ?? !autoCollapseOnFinish));
          }
        }}
      >
        <Brain
          className={loading ? styles.brainIconPulse : styles.brainIcon}
          aria-hidden="true"
          size={14}
        />
        <span className={loading ? styles.shimmerLabel : undefined}>{label}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={styles.indicator}
          data-expanded={isExpanded ? 'true' : 'false'}
        />
      </Button>

      <div ref={collapseRef} id={panelId} className={styles.collapse} aria-hidden={!isExpanded}>
        <blockquote className={styles.content}>{content}</blockquote>
      </div>
    </div>
  );
}

export default ReasoningBlock;
