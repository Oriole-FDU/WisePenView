import { createContext } from 'react';

import type { TableCellAlignValue } from '../cellAlign';

export const TableColumnAlignContext = createContext<TableCellAlignValue>('center');
