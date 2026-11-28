import type { ReactNode } from 'react';

import type { TableCellAlignValue } from '../../TableBase/cellAlign';

export type { TableCellAlignValue };

export interface TableCellAlignProps {
  align?: TableCellAlignValue;
  /** 子内容占满 host 可用宽度（QuotaBar、Select 等） */
  stretch?: boolean;
  children: ReactNode;
  className?: string;
}
