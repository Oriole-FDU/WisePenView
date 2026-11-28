import type { FolderColumnWidth } from '../../../shared/TableBase/columnWidth';

export interface FolderTableSkeletonColumn {
  id: string;
  width?: FolderColumnWidth;
  align?: 'start' | 'center' | 'end';
  isNameColumn?: boolean;
  isActionColumn?: boolean;
}

export interface FolderTableLoadingSkeletonProps {
  rowCount?: number;
  columns: FolderTableSkeletonColumn[];
  eqLayout?: boolean;
  showCheckboxSelection?: boolean;
}
