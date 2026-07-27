import type { SortDescriptor } from '@heroui/react';

export type TableSortValue = string | number | null | undefined;

export interface TableSortColumn<T extends object, C = unknown> {
  id: string;
  allowsSorting?: boolean;
  getSortValue?: (row: T, ctx: C) => TableSortValue;
  /** 名称 / 日期类：文件夹与文件分组后再比 */
  sortFolderGroup?: boolean;
}

export interface SortTableRowsOptions<T extends object> {
  getEntryType?: (row: T) => string;
  isPinnedFirst?: (row: T) => boolean;
  isPinnedLast?: (row: T) => boolean;
  locale?: string;
}

function isFolderLikeEntry(entryType: string): boolean {
  return entryType === 'folder' || entryType === 'root';
}

function compareSortValues(a: TableSortValue, b: TableSortValue, locale?: string): number {
  if (a == null && b == null) {
    return 0;
  }
  if (a == null) {
    return 1;
  }
  if (b == null) {
    return -1;
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  return String(a).localeCompare(String(b), locale, { numeric: true, sensitivity: 'base' });
}

function buildValueComparator<T extends object, C>(
  column: TableSortColumn<T, C>,
  direction: SortDescriptor['direction'],
  getContext: (row: T) => C,
  locale?: string
): (a: T, b: T) => number {
  const dir = direction === 'descending' ? -1 : 1;

  const compareValues = (a: T, b: T) => {
    const valueA = column.getSortValue?.(a, getContext(a));
    const valueB = column.getSortValue?.(b, getContext(b));
    return compareSortValues(valueA, valueB, locale) * dir;
  };

  if (!column.sortFolderGroup) {
    return compareValues;
  }

  return (a, b) => {
    const getEntryType = (row: T) => {
      const entryType = (row as { entryType?: string }).entryType;
      return entryType ?? '';
    };
    const aFolder = isFolderLikeEntry(getEntryType(a));
    const bFolder = isFolderLikeEntry(getEntryType(b));
    if (aFolder !== bFolder) {
      return aFolder ? -1 : 1;
    }
    return compareValues(a, b);
  };
}

function resolveSortColumn<T extends object, C>(
  columns: TableSortColumn<T, C>[],
  sortDescriptor: SortDescriptor | undefined
): TableSortColumn<T, C> | undefined {
  if (!sortDescriptor?.column) {
    return undefined;
  }
  const column = columns.find((item) => item.id === sortDescriptor.column);
  if (!column?.allowsSorting || !column.getSortValue) {
    return undefined;
  }
  return column;
}

function comparePinnedRows<T extends object>(
  a: T,
  b: T,
  options: SortTableRowsOptions<T> | undefined
): number {
  const aPinnedFirst = options?.isPinnedFirst?.(a) === true;
  const bPinnedFirst = options?.isPinnedFirst?.(b) === true;
  if (aPinnedFirst || bPinnedFirst) {
    if (aPinnedFirst && bPinnedFirst) return 0;
    return aPinnedFirst ? -1 : 1;
  }

  const aPinnedLast = options?.isPinnedLast?.(a) === true;
  const bPinnedLast = options?.isPinnedLast?.(b) === true;
  if (aPinnedLast || bPinnedLast) {
    if (aPinnedLast && bPinnedLast) return 0;
    return aPinnedLast ? 1 : -1;
  }

  return 0;
}

export function sortTableRows<T extends object, C>(
  rows: T[],
  columns: TableSortColumn<T, C>[],
  sortDescriptor: SortDescriptor | undefined,
  getContext: (row: T) => C,
  options?: SortTableRowsOptions<T>
): T[] {
  const column = resolveSortColumn(columns, sortDescriptor);
  if (!column || !sortDescriptor) {
    return rows;
  }

  const compare = buildValueComparator(
    column,
    sortDescriptor.direction,
    getContext,
    options?.locale
  );

  return [...rows].sort((a, b) => {
    const pinnedCompare = comparePinnedRows(a, b, options);
    if (pinnedCompare !== 0) return pinnedCompare;
    return compare(a, b);
  });
}

export function sortFolderTreeRows<T extends object, C>(
  rows: T[],
  columns: TableSortColumn<T, C>[],
  sortDescriptor: SortDescriptor | undefined,
  getContext: (row: T) => C,
  options?: SortTableRowsOptions<T>
): T[] {
  const column = resolveSortColumn(columns, sortDescriptor);
  if (!column || !sortDescriptor) {
    return rows;
  }

  const compare = buildValueComparator(
    column,
    sortDescriptor.direction,
    getContext,
    options?.locale
  );

  const readChildren = (row: T): T[] | undefined => {
    const children = (row as { children?: T[] }).children;
    return children?.length ? children : undefined;
  };

  const sortLevel = (levelRows: T[]): T[] =>
    [...levelRows]
      .sort((a, b) => {
        const pinnedCompare = comparePinnedRows(a, b, options);
        if (pinnedCompare !== 0) return pinnedCompare;
        return compare(a, b);
      })
      .map((row) => {
        const children = readChildren(row);
        return {
          ...row,
          children: children ? sortLevel(children) : children,
        };
      });

  return sortLevel(rows);
}
