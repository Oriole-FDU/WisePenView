import { tableStyles } from '../styles';
import type { TableColumnWidth } from './index.type';

/** 基础列宽预设 */
const BASE_COLUMN_WIDTH_CLASS: Record<TableColumnWidth, string> = {
  fill: tableStyles.colFill,
  sm: tableStyles.colSm,
  md: tableStyles.colMd,
  lg: tableStyles.colLg,
  eq: tableStyles.colEq,
};

/** Folder 型专用 alias（TanStack `size` + 业务语义层） */
export type FolderColumnWidth = TableColumnWidth | 'folderSize' | 'folderType' | 'folderAction';

const FOLDER_COLUMN_WIDTH_CLASS: Record<FolderColumnWidth, string> = {
  ...BASE_COLUMN_WIDTH_CLASS,
  folderSize: tableStyles.colFolderSize,
  folderType: tableStyles.colFolderType,
  folderAction: tableStyles.colFolderAction,
};

/** Editable 型专用 alias */
export type EditableColumnWidth = TableColumnWidth | 'action' | 'checkbox' | 'enum';

const EDITABLE_COLUMN_WIDTH_CLASS: Record<EditableColumnWidth, string> = {
  ...BASE_COLUMN_WIDTH_CLASS,
  action: tableStyles.colAction,
  checkbox: tableStyles.colCheckbox,
  enum: tableStyles.colEnum,
};

export function resolveBaseColumnWidthClass(width?: TableColumnWidth): string | undefined {
  if (!width) {
    return undefined;
  }
  return BASE_COLUMN_WIDTH_CLASS[width];
}

export function resolveFolderColumnWidthClass(width?: FolderColumnWidth): string | undefined {
  if (!width) {
    return undefined;
  }
  return FOLDER_COLUMN_WIDTH_CLASS[width];
}

export function resolveEditableColumnWidthClass(width?: EditableColumnWidth): string | undefined {
  if (!width) {
    return undefined;
  }
  return EDITABLE_COLUMN_WIDTH_CLASS[width];
}

export function isReadonlyEqualColumnLayout(columns: Array<{ width?: TableColumnWidth }>): boolean {
  return (
    columns.length > 0 &&
    columns.every((column) => column.width === undefined || column.width === 'eq')
  );
}

export function getReadonlyEqColumnCount(
  columns: Array<{ width?: TableColumnWidth }>
): number | undefined {
  if (!isReadonlyEqualColumnLayout(columns)) {
    return undefined;
  }
  return columns.length;
}

export function resolveReadonlyColumnWidth(
  width: TableColumnWidth | undefined,
  equalLayout: boolean
): TableColumnWidth | undefined {
  if (width) {
    return width;
  }
  return equalLayout ? 'eq' : undefined;
}

export function resolveReadonlyColumnWidthClass(
  width: TableColumnWidth | undefined,
  equalLayout: boolean
): string | undefined {
  return resolveBaseColumnWidthClass(resolveReadonlyColumnWidth(width, equalLayout));
}

export function countFolderEqColumns(
  columns: Array<{ width?: FolderColumnWidth; isNameColumn?: boolean; isActionColumn?: boolean }>
): number | undefined {
  const eqColumns = columns.filter(
    (column) =>
      !column.isNameColumn &&
      !column.isActionColumn &&
      (column.width === undefined || column.width === 'eq')
  );
  if (eqColumns.length === 0) {
    return undefined;
  }
  const allMiddleAreEq = columns.every((column) => {
    if (column.isNameColumn || column.isActionColumn) {
      return true;
    }
    return column.width === undefined || column.width === 'eq';
  });
  if (!allMiddleAreEq) {
    return undefined;
  }
  return eqColumns.length;
}

export function resolveFolderColumnWidth(
  column: {
    width?: FolderColumnWidth;
    isNameColumn?: boolean;
    isActionColumn?: boolean;
  },
  eqLayout: boolean
): FolderColumnWidth | undefined {
  if (column.width) {
    return column.width;
  }
  if (column.isNameColumn) {
    return 'fill';
  }
  if (column.isActionColumn) {
    return 'folderAction';
  }
  return eqLayout ? 'eq' : undefined;
}

export function resolveFolderColumnWidthClassForColumn(
  column: {
    width?: FolderColumnWidth;
    isNameColumn?: boolean;
    isActionColumn?: boolean;
  },
  eqLayout: boolean
): string | undefined {
  return resolveFolderColumnWidthClass(resolveFolderColumnWidth(column, eqLayout));
}

export function isFolderEqLayout(
  columns: Array<{
    width?: FolderColumnWidth;
    isNameColumn?: boolean;
    isActionColumn?: boolean;
  }>
): boolean {
  return countFolderEqColumns(columns) !== undefined;
}

export type ReadonlySkeletonBarWidth = 'sm' | 'md' | 'lg';

export function resolveReadonlySkeletonBarWidth(
  width: TableColumnWidth | undefined,
  equalLayout: boolean,
  isRowHeader?: boolean
): ReadonlySkeletonBarWidth {
  if (isRowHeader) {
    return 'lg';
  }

  const resolved = resolveReadonlyColumnWidth(width, equalLayout);
  switch (resolved) {
    case 'sm':
      return 'sm';
    case 'lg':
    case 'fill':
      return 'lg';
    case 'md':
      return 'md';
    case 'eq':
    default:
      return 'md';
  }
}

export function resolveFolderSkeletonBarWidth(
  column: {
    width?: FolderColumnWidth;
    isNameColumn?: boolean;
    isActionColumn?: boolean;
  },
  eqLayout: boolean
): ReadonlySkeletonBarWidth | undefined {
  if (column.isActionColumn) {
    return undefined;
  }
  if (column.isNameColumn) {
    return 'lg';
  }

  const resolved = resolveFolderColumnWidth(column, eqLayout);
  switch (resolved) {
    case 'folderSize':
    case 'sm':
      return 'sm';
    case 'folderType':
    case 'md':
      return 'md';
    case 'lg':
    case 'fill':
      return 'lg';
    case 'eq':
    default:
      return 'md';
  }
}
