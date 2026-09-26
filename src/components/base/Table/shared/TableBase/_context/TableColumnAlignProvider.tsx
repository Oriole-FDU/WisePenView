import type { ReactNode } from 'react';

import type { TableCellAlignValue } from '../cellAlign';
import { TableColumnAlignContext } from './TableColumnAlignContext';

export function TableColumnAlignProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: TableCellAlignValue;
}) {
  return (
    <TableColumnAlignContext.Provider value={value}>{children}</TableColumnAlignContext.Provider>
  );
}
