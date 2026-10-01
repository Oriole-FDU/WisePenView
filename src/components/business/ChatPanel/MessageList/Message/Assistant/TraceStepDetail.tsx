import { useState } from 'react';

import styles from './ProcessTrace.module.less';
import { describeTraceItem, type TraceItem } from './traceModel';
import TraceRow from './TraceRow';

interface TraceStepDetailProps {
  item: TraceItem;
  measuredDurations: Readonly<Record<string, number>>;
}

/**
 * 过程组展开后的单个节点：只有一行标签，思考正文需要再展开一次才露出。
 * 工具与 Skill 节点不再回放载荷，所以只保留标签。
 */
function TraceStepDetail({ item, measuredDurations }: TraceStepDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const headline = describeTraceItem(item, measuredDurations);
  const reasoningContent = item.kind === 'reasoning' ? item.content : '';
  const isStreaming = item.kind === 'reasoning' && item.streaming;

  return (
    <li className={styles.step}>
      <TraceRow
        expanded={expanded}
        headline={headline}
        item={item}
        animated={isStreaming}
        onToggle={() => setExpanded((current) => !current)}
      >
        {reasoningContent ? (
          <blockquote className={styles.reasoning}>{reasoningContent}</blockquote>
        ) : null}
      </TraceRow>
    </li>
  );
}

export default TraceStepDetail;
