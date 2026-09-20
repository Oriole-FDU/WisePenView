import type { Selection, SortDescriptor } from '@heroui/react';
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
  getCellClassName?: (row: T, ctx: DataTableRowContext<T>) => string | undefined;
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
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
  selection?: {
    selectedKeys: Selection;
    onSelectionChange: (keys: Selection) => void;
    disabledKeys?: Iterable<string>;
  };
  /** 行内编辑需要保留控件挂载；普通列表默认使用虚拟滚动。 */
  virtualized?: boolean;
}

export type { DataTableTab, DataTableTabsProps } from './parts/UnderlineTabs/index.type';
