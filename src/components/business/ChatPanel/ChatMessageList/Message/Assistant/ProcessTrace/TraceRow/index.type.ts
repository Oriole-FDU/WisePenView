import type { ReactNode } from 'react';

import type { TraceHeadline, TraceItem } from '../../traceModel';

export interface TraceRowProps {
  /** 折叠面板正文；为空时整行只显示提示，不可展开 */
  children?: ReactNode;
  expanded: boolean;
  /** 行标文案与色调 */
  headline: TraceHeadline;
  /** 行首图标所属节点 */
  item: TraceItem;
  /** 流式中是否让行标做轮换动画 */
  animated: boolean;
  onToggle: () => void;
}
