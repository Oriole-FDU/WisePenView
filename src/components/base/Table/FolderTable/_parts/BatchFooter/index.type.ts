import type { ReactNode } from 'react';

export interface TableBatchFooterProps {
  /** 已选行数 */
  selectedCount: number;
  /** 默认「已选 M 项」 */
  summary?: ReactNode;
  /** 批量操作区：Select、确认/取消等 */
  children?: ReactNode;
  className?: string;
}
