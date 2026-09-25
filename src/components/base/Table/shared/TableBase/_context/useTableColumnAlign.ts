import { useContext } from 'react';

import { TableColumnAlignContext } from './TableColumnAlignContext';

export function useTableColumnAlign() {
  return useContext(TableColumnAlignContext);
}
