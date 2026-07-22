import type { SortDescriptor } from '@heroui/react';
import type { ReactNode } from 'react';
import type {
  TableColumnBase,
  TableColumnWidth,
  TableLoadMore,
} from '../shared/TableBase/index.type';

export interface DataTableRowContext<T> {
  row: T;
  rowId: string;
}

export interface DataTableColumn<T extends object> extends Omit<
  TableColumnBase<T, DataTableRowContext<T>>,
  'renderCell'
> {
  width?: TableColumnWidth;
  renderCell: (row: T, ctx: DataTableRowContext<T>) => ReactNode;
}

export type DataTableLoadMore = TableLoadMore;

export interface DataTablePagination {
  total: number;
  current: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
  summary?: ReactNode;
  pageSizeControl?: ReactNode;
}

export interface DataTableProps<T extends object> {
  ariaLabel: string;
  items: T[];
  rowKey: keyof T & string;
  columns: DataTableColumn<T>[];
  loading?: boolean;
  refreshing?: boolean;
  emptyText?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  skeletonRowCount?: number;
  className?: string;
  maxBodyHeight?: number | string;
  title?: ReactNode;
  tabs?: ReactNode;
  toolbar?: ReactNode;
  loadMore?: DataTableLoadMore;
  totalCount?: number;
  pagination?: DataTablePagination;
  summary?: ReactNode;
  getRowClassName?: (row: T, ctx: DataTableRowContext<T>) => string | undefined;
  /** 行激活回调（点击行或键盘激活）；传入后行可点击 */
  onRowPress?: (row: T, ctx: DataTableRowContext<T>) => void;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
}

export type { DataTableTab, DataTableTabsProps } from './parts/UnderlineTabs/index.type';
