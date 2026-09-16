import { createContext, useContext } from 'react';

import { tableCellStyles } from '../styles';
import type { TableColumnBase, TableColumnWidth } from './index.type';

export type TableCellAlignValue = NonNullable<TableColumnBase<object>['align']>;

export const DEFAULT_TABLE_COLUMN_ALIGN: TableCellAlignValue = 'center';

export const TableColumnAlignContext = createContext<TableCellAlignValue>(
  DEFAULT_TABLE_COLUMN_ALIGN
);

export function useTableColumnAlign(): TableCellAlignValue {
  return useContext(TableColumnAlignContext);
}

export function resolveColumnAlign(align?: TableCellAlignValue): TableCellAlignValue {
  return align ?? DEFAULT_TABLE_COLUMN_ALIGN;
}

export function resolveCellContentHostClass(align?: TableCellAlignValue): string {
  switch (resolveColumnAlign(align)) {
    case 'center':
      return tableCellStyles.cellContentHostCenter;
    case 'end':
      return tableCellStyles.cellContentHostEnd;
    default:
      return tableCellStyles.cellContentHostStart;
  }
}

export type TableCellContentStretchMode = 'view' | 'edit';

export function shouldStretchTableCellContent(
  column: {
    width?: TableColumnWidth | string;
    renderEditCell?: unknown;
    isNameColumn?: boolean;
  },
  mode: TableCellContentStretchMode = 'view'
): boolean {
  if (mode === 'edit' && column.renderEditCell) {
    if (column.isNameColumn) {
      return true;
    }
    return column.width === 'fill' || column.width === 'lg' || column.width === undefined;
  }
  if (column.isNameColumn) {
    return true;
  }
  return column.width === 'fill' || column.width === 'lg';
}

export function joinClassNames(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ');
}
