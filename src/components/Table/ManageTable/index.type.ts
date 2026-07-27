import type { Selection, SortDescriptor } from '@heroui/react';
import type { ReactNode } from 'react';
import type { EditableColumnWidth } from '../shared/TableBase/columnWidth';
import type { TableColumnBase } from '../shared/TableBase/index.type';
import type { TableRowAction } from '../shared/TableRowActions/index.type';

export type ManageTableRowState = 'default' | 'editing' | 'saving' | 'error';

export interface ManageTableRowContext<T> {
  row: T;
  rowId: string;
  state: ManageTableRowState;
}

export interface ManageTableColumn<T extends object> extends Omit<
  TableColumnBase<T, ManageTableRowContext<T>>,
  'renderCell' | 'width'
> {
  width?: EditableColumnWidth;
  renderCell: (row: T, ctx: ManageTableRowContext<T>) => ReactNode;
  renderEditCell?: (row: T, ctx: ManageTableRowContext<T>) => ReactNode;
}

export type ManageTableRowAction<T> = TableRowAction<T>;

export interface ManageTablePagination {
  total: number;
  current: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
  summary?: ReactNode;
  pageSizeControl?: ReactNode;
}

export interface ManageTableBatchSelection {
  selectedKeys: Selection;
  onSelectionChange: (keys: Selection) => void;
  disabledKeys?: Iterable<string>;
}

export interface ManageTableInlineEdit<T> {
  editingRowId: string | null;
  savingRowId?: string | null;
  errorRowId?: string | null;
  errorMessage?: string | null;
  onDismissError?: () => void;
  onSave: (row: T) => void | Promise<void>;
  onCancel: () => void;
}

export interface ManageTableProps<T extends object> {
  ariaLabel: string;
  items: T[];
  rowKey: keyof T & string;
  columns: ManageTableColumn<T>[];
  loading?: boolean;
  emptyText?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  loadingText?: string;
  className?: string;
  title?: ReactNode;
  toolbar?: ReactNode;
  rowActions?: ManageTableRowAction<T>[] | ((row: T) => ManageTableRowAction<T>[]);
  renderRowActions?: (row: T, ctx: ManageTableRowContext<T>) => ReactNode;
  batchSelection?: ManageTableBatchSelection;
  batchFooter?: ReactNode;
  inlineEdit?: ManageTableInlineEdit<T>;
  pagination?: ManageTablePagination;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
  getRowClassName?: (row: T, ctx: ManageTableRowContext<T>) => string | undefined;
}
