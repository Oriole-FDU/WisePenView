import { useState } from 'react';

import { describeTraceItem, getToolOutputText } from '../../traceModel';
import ReasoningBlock from '../ReasoningBlock';
import TraceRow from '../TraceRow';
import type { TraceStepDetailProps } from './index.type';
import styles from './style.module.scss';

/**
 * 过程组展开后的单个节点：有正文（思考 / 工具输出）时可再展开；
 * 行标箭头默认隐藏，hover 时再显现。
 */
function TraceStepDetail({ item, measuredDurations }: TraceStepDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const headline = describeTraceItem(item, measuredDurations);
  const reasoningContent = item.kind === 'reasoning' ? item.content : '';
  const toolOutput = item.kind === 'tool' ? getToolOutputText(item.part) : undefined;
  const detailContent = reasoningContent || toolOutput;
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
        {detailContent ? <ReasoningBlock>{detailContent}</ReasoningBlock> : null}
      </TraceRow>
    </li>
  );
}

export default TraceStepDetail;
