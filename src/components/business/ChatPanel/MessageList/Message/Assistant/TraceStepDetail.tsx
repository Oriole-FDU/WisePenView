import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { LoadingText } from '@/components/Chat';

import styles from './ProcessTrace.module.less';
import TraceIcon from './TraceIcon';
import { describeTraceItem, type TraceItem } from './traceModel';
import { useCollapseHeight } from './useCollapseHeight';

interface TraceStepDetailProps {
  item: TraceItem;
  measuredDurations: Readonly<Record<string, number>>;
}

/**
 * 过程组展开后的单个节点：只有一行标签，思考正文需要再展开一次才露出。
 * 工具与 Skill 节点不再回放载荷，所以只保留标签。
 */
function TraceStepDetail({ item, measuredDurations }: TraceStepDetailProps) {
  const { t } = useTranslation('chat');
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const collapseRef = useCollapseHeight(expanded);
  const headline = describeTraceItem(item, measuredDurations);
  const reasoningContent = item.kind === 'reasoning' ? item.content : '';
  const isStreaming = item.kind === 'reasoning' && item.streaming;
  const isCollapsible = Boolean(reasoningContent);

  const header = (
    <>
      <TraceIcon item={item} tone={headline.tone} className={styles.icon} />
      <LoadingText tone={headline.tone} size="sm" animated={isStreaming}>
        {t(headline.key, headline.options)}
      </LoadingText>
      {isCollapsible ? (
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={styles.indicator}
          data-expanded={expanded ? 'true' : 'false'}
        />
      ) : null}
    </>
  );

  return (
    <li className={styles.step}>
      {isCollapsible ? (
        <AppButton
          variant="ghost"
          size="sm"
          className={styles.trigger}
          aria-expanded={expanded}
          aria-controls={panelId}
          onPress={() => setExpanded((current) => !current)}
        >
          {header}
        </AppButton>
      ) : (
        <div className={styles.hintRow}>{header}</div>
      )}

      {isCollapsible ? (
        <div ref={collapseRef} id={panelId} className={styles.collapse} aria-hidden={!expanded}>
          <blockquote className={styles.reasoning}>{reasoningContent}</blockquote>
        </div>
      ) : null}
    </li>
  );
}

export default TraceStepDetail;
