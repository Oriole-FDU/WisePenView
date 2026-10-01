import { useState } from 'react';

import styles from './ProcessTrace.module.less';
import {
  describeTraceItem,
  findActiveTraceIndex,
  type TraceHeadline,
  type TraceItem,
} from './traceModel';
import TraceRow from './TraceRow';
import TraceStepDetail from './TraceStepDetail';
import { useTraceReasoningDurations } from './useTraceReasoningDurations';

interface ProcessTraceProps {
  /** 连续的思考与工具调用节点，按发生顺序排列 */
  items: readonly TraceItem[];
  /** 消息是否仍在流式输出；非流式时不再轮换“当前节点”，只展示收敛后的结果 */
  streaming: boolean;
}

/**
 * 思考、工具调用与 Skill 加载的统一过程行。
 * 默认折叠成一行并轮换展示当前节点；展开后铺开节点详情：
 * 只有一个节点时直接展开它的正文，多个节点时才逐条列出行标。
 */
function ProcessTrace({ items, streaming }: ProcessTraceProps) {
  const [expanded, setExpanded] = useState(false);
  const measuredDurations = useTraceReasoningDurations(items);

  if (items.length === 0) return null;

  const activeIndex = streaming ? findActiveTraceIndex(items) : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
  const headlineItem = activeItem ?? items[items.length - 1];
  const isSingleItem = items.length === 1;
  const singleItemContent =
    isSingleItem && headlineItem.kind === 'reasoning' ? headlineItem.content : '';
  // 多节点展开后换成汇总文案，避免首行与最后一条节点行重复
  const headline: TraceHeadline =
    expanded && !isSingleItem
      ? { key: 'message.trace.summary', options: { count: items.length }, tone: 'muted' }
      : describeTraceItem(headlineItem, measuredDurations);

  const panelContent = isSingleItem ? (
    singleItemContent ? (
      <blockquote className={styles.reasoning}>{singleItemContent}</blockquote>
    ) : null
  ) : (
    <ol className={styles.steps}>
      {items.map((item) => (
        <TraceStepDetail key={item.key} item={item} measuredDurations={measuredDurations} />
      ))}
    </ol>
  );

  return (
    <div className={styles.wrapper}>
      <TraceRow
        expanded={expanded}
        headline={headline}
        item={headlineItem}
        animated={activeItem != null && !expanded}
        onToggle={() => setExpanded((current) => !current)}
      >
        {panelContent}
      </TraceRow>
    </div>
  );
}

export default ProcessTrace;
