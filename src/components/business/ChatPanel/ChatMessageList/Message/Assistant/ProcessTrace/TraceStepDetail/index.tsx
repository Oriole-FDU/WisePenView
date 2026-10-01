import { useState } from 'react';

import { describeTraceItem } from '../../traceModel';
import ReasoningBlock from '../ReasoningBlock';
import TraceRow from '../TraceRow';
import type { TraceStepDetailProps } from './index.type';
import styles from './style.module.less';

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
        {reasoningContent ? <ReasoningBlock>{reasoningContent}</ReasoningBlock> : null}
      </TraceRow>
    </li>
  );
}

export default TraceStepDetail;
