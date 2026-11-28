import type { ReactNode } from 'react';

export interface TableTextCellProps {
  children: ReactNode;
  /** Tooltip / title 全文；默认取 string children */
  title?: string;
  className?: string;
  /** 纯文本列对齐；与列 align 一致时配合 TableCellAlign 使用 */
  align?: 'start' | 'center' | 'end';
  /** 使用 cellEmphasis 样式 */
  emphasis?: boolean;
  /** 使用 cellMuted 样式 */
  muted?: boolean;
}
