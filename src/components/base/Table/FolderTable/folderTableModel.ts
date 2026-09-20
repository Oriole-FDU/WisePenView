import type { FolderTableRow, FolderTableVisibleRow } from './index.type';

export function flattenFolderRows<T extends FolderTableRow>(
  rows: T[],
  expandedKeys: Set<string>,
  depth = 0
): Array<FolderTableVisibleRow & T> {
  const result: Array<FolderTableVisibleRow & T> = [];

  for (const row of rows) {
    result.push({ ...row, depth });
    const hasChildren = Boolean(row.children?.length);
    if (
      (row.entryType === 'root' || row.entryType === 'folder') &&
      hasChildren &&
      expandedKeys.has(row.id)
    ) {
      result.push(...flattenFolderRows(row.children as T[], expandedKeys, depth + 1));
    }
  }

  return result;
}

export function folderRowHasChildren(row: FolderTableRow): boolean {
  return (
    (row.entryType === 'root' || row.entryType === 'folder') &&
    (row.isExpandable === true || Boolean(row.children?.length))
  );
}

export function isFolderContainerRow(row: FolderTableRow): boolean {
  return row.entryType === 'root' || row.entryType === 'folder';
}

export function collectDescendantSelectableRowIds<T extends FolderTableRow>(
  row: T,
  disabledKeys: Set<string>,
  hiddenKeys: Set<string>
): string[] {
  const result: string[] = [];
  const visit = (children: T[] | undefined) => {
    children?.forEach((child) => {
      if (
        child.entryType !== 'loading' &&
        !disabledKeys.has(child.id) &&
        !hiddenKeys.has(child.id)
      ) {
        result.push(child.id);
      }
      visit(child.children as T[] | undefined);
    });
  };
  visit(row.children as T[] | undefined);
  return result;
}

export function normalizeTreeSelection<T extends FolderTableRow>(
  rows: T[],
  selectedKeys: Set<string>,
  disabledKeys: Set<string>,
  hiddenKeys: Set<string>,
  ancestorSelected = false
): Set<string> {
  const nextKeys = new Set(selectedKeys);
  rows.forEach((row) => {
    const selectable =
      row.entryType !== 'loading' && !disabledKeys.has(row.id) && !hiddenKeys.has(row.id);
    const currentSelected = selectable && selectedKeys.has(row.id);
    if (selectable && ancestorSelected) {
      nextKeys.delete(row.id);
    }
    const childAncestorSelected =
      ancestorSelected || (currentSelected && isFolderContainerRow(row));
    if (row.children?.length) {
      const normalizedChildren = normalizeTreeSelection(
        row.children as T[],
        nextKeys,
        disabledKeys,
        hiddenKeys,
        childAncestorSelected
      );
      nextKeys.clear();
      normalizedChildren.forEach((key) => nextKeys.add(key));
    }
  });
  return nextKeys;
}

export function buildVisualSelectedRowKeySet<T extends FolderTableRow>(
  visibleRows: Array<FolderTableVisibleRow & T>,
  selectedKeys: Set<string>,
  disabledKeys: Set<string>,
  hiddenKeys: Set<string>
): Set<string> {
  const result = new Set<string>();
  const selectedAncestorDepths: number[] = [];

  visibleRows.forEach((row) => {
    while (
      selectedAncestorDepths.length > 0 &&
      (selectedAncestorDepths[selectedAncestorDepths.length - 1] ?? 0) >= row.depth
    ) {
      selectedAncestorDepths.pop();
    }

    const selectable =
      row.entryType !== 'loading' && !disabledKeys.has(row.id) && !hiddenKeys.has(row.id);
    const inheritedSelected = selectedAncestorDepths.length > 0;
    const explicitlySelected = selectedKeys.has(row.id);

    if (selectable && (explicitlySelected || inheritedSelected)) {
      result.add(row.id);
    }
    if (selectable && explicitlySelected && isFolderContainerRow(row)) {
      selectedAncestorDepths.push(row.depth);
    }
  });

  return result;
}

export function getSelectionRange(
  ids: string[],
  rowId: string,
  anchorId: string | undefined,
  shiftKey: boolean
): string[] {
  const anchorIndex = anchorId ? ids.indexOf(anchorId) : -1;
  const rowIndex = ids.indexOf(rowId);
  if (!shiftKey || anchorIndex < 0 || rowIndex < 0) return [rowId];
  return ids.slice(Math.min(anchorIndex, rowIndex), Math.max(anchorIndex, rowIndex) + 1);
}
