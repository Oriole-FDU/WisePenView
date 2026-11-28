import type { TableColumnWidth } from '../../../shared/TableBase/index.type';

interface DataTableSkeletonColumn {
  id: string;
  width?: TableColumnWidth;
  align?: 'start' | 'center' | 'end';
  isRowHeader?: boolean;
  className?: string;
}

export interface DataTableLoadingSkeletonProps {
  rowCount?: number;
  columns: DataTableSkeletonColumn[];
  equalLayout?: boolean;
}
