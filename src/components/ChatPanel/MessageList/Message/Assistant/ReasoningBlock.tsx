import { useMessageScroller } from '@/components/_shadcn';
import { useEffectForce } from '@/hooks/useEffectForce';
import { Button, Disclosure } from '@heroui/react';
import { Brain } from 'lucide-react';
import { useRef, useState } from 'react';
import styles from './ReasoningBlock.module.less';

interface ReasoningBlockProps {
  content: string;
  loading: boolean;

  durationSeconds?: number;
}

function formatReasoningLabel(loading: boolean, durationSeconds?: number): string {
  if (loading) return '思考中...';
  if (durationSeconds != null && durationSeconds >= 0) {
    return `思考了 ${durationSeconds} 秒`;
  }
  return '思考过程';
}

function ReasoningBlock({ content, loading, durationSeconds }: ReasoningBlockProps) {
  const [userExpanded, setUserExpanded] = useState(loading);
  const [localDurationSeconds, setLocalDurationSeconds] = useState<number | undefined>(
    durationSeconds
  );
  const previousLoadingRef = useRef(loading);
  const startedAtRef = useRef<number | null>(null);
  const { scrollToEndUnlessUserInterrupted } = useMessageScroller();
  const isExpanded = loading || userExpanded;
  const displayDuration = durationSeconds ?? localDurationSeconds;

  /**
   * 对齐 AI Elements Reasoning：流式时自动展开，结束后自动收起并结算耗时。
   * 下滚是否保留阅读位置由消息滚动控制器统一处理。
   */
  useEffectForce(() => {
    const wasLoading = previousLoadingRef.current;
    previousLoadingRef.current = loading;

    if (loading) {
      if (startedAtRef.current == null) startedAtRef.current = Date.now();
      setUserExpanded(true);
      return;
    }

    if (wasLoading && !loading) {
      if (startedAtRef.current != null) {
        const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        setLocalDurationSeconds(elapsedSeconds);
        startedAtRef.current = null;
      }
      setUserExpanded(false);
      scrollToEndUnlessUserInterrupted();
    }
  }, [loading, scrollToEndUnlessUserInterrupted]);

  if (!content && !loading) return null;

  return (
    <Disclosure
      isExpanded={isExpanded}
      onExpandedChange={(next) => {
        if (!loading) setUserExpanded(next);
      }}
      className={styles.wrapper}
    >
      <Disclosure.Heading>
        <Button slot="trigger" variant="ghost" size="sm" className={styles.header}>
          <Brain
            className={loading ? styles.brainIconPulse : styles.brainIcon}
            aria-hidden="true"
            size={14}
          />
          <span className={loading ? styles.shimmerLabel : undefined}>
            {formatReasoningLabel(loading, displayDuration)}
          </span>
          <Disclosure.Indicator />
        </Button>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body>
          <blockquote className={styles.content}>{content}</blockquote>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

export default ReasoningBlock;
