import type { SortDescriptor } from '@heroui/react';
import type { ReactNode } from 'react';

import type { TableCellAlignValue } from '../TableBase/cellAlign';

export interface TableSortColumnLabelProps {
  label: ReactNode;
  sortDirection?: SortDescriptor['direction'];
  align?: TableCellAlignValue;
}
