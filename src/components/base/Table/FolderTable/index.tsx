import { Table } from '@heroui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Folder } from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  memo,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type UIEvent,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';

import TableBatchFooter from '../ManageTable/parts/BatchFooter';
import TableCellAlign from '../shared/cells/CellAlign';
import TableTextCell from '../shared/cells/TextCell';
import { tableCellStyles, tableStyles } from '../shared/styles';
import {
  joinClassNames,
  resolveColumnAlign,
  shouldStretchTableCellContent,
} from '../shared/TableBase/cellAlign';
import {
  countFolderEqColumns,
  isFolderEqLayout,
  resolveFolderColumnWidthClassForColumn,
} from '../shared/TableBase/columnWidth';
import { sortFolderTreeRows } from '../shared/TableBase/tableSort';
import TableBodyState from '../shared/TableBodyState';
import TableRowActions from '../shared/TableRowActions';
import type { TableRowActionItem } from '../shared/TableRowActions/index.type';
import TableSelectionCheckbox from '../shared/TableSelectionCheckbox';
import { renderSortableColumnLabel } from '../shared/TableSortHeader/renderSortableColumnLabel';
import { TableLoadMoreRow } from '../shared/TableStatusRows';
import TableSummaryFooter from '../shared/TableSummaryFooter';
import { createDefaultFolderColumns } from './defaultColumns';
import type {
  FolderTableColumn,
  FolderTableProps,
  FolderTableRow,
  FolderTableRowAction,
  FolderTableRowContext,
  FolderTableVisibleRow,
} from './index.type';
import FolderTableNameCell from './parts/FolderNameCell';
import FolderTableLoadingSkeleton from './parts/LoadingSkeleton';
import styles from './style.module.less';

const LOAD_MORE_THRESHOLD_PX = 48;
const VIRTUAL_ROW_ESTIMATE_SIZE = 60;
const VIRTUAL_ROW_OVERSCAN = 8;
const ROW_ID_ATTRIBUTE = 'data-folder-row-id';
const INTERACTIVE_ROW_TARGET_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[data-row-click-ignore="true"]',
  '[data-slot="selection"]',
  '[slot="selection"]',
  '.checkbox',
].join(',');

function flattenFolderRows<T extends FolderTableRow>(
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

function folderRowHasChildren(row: FolderTableRow): boolean {
  return (
    (row.entryType === 'root' || row.entryType === 'folder') &&
    (row.isExpandable === true || Boolean(row.children?.length))
  );
}

function isFolderContainerRow(row: FolderTableRow): boolean {
  return row.entryType === 'root' || row.entryType === 'folder';
}

function collectDescendantSelectableRowIds<T extends FolderTableRow>(
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

function normalizeTreeSelection<T extends FolderTableRow>(
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

function buildVisualSelectedRowKeySet<T extends FolderTableRow>(
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

function resolveMaxBodyHeight(value: number | string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'number' ? `${value}px` : value;
}

function resolveFolderDepthIndentStyle(depth: number): CSSProperties {
  return {
    '--folder-table-depth-indent': `${depth * 24}px`,
  } as CSSProperties;
}

function evaluateRowPredicate<T>(
  predicate: boolean | ((row: T) => boolean) | undefined,
  row: T,
  defaultValue = true
): boolean {
  if (predicate === undefined) {
    return defaultValue;
  }
  return typeof predicate === 'function' ? predicate(row) : predicate;
}

function resolveRowActions<T extends FolderTableRow>(
  row: T,
  rowActions: FolderTableProps<T>['rowActions']
): FolderTableRowAction<T>[] {
  if (!rowActions) {
    return [];
  }
  return typeof rowActions === 'function' ? rowActions(row) : rowActions;
}

function toMenuActions<T extends FolderTableRow>(
  actions: FolderTableRowAction<T>[],
  row: T
): TableRowActionItem[] {
  return actions
    .filter((action) => evaluateRowPredicate(action.visible, row))
    .map((action) => ({
      key: action.key,
      label: action.label,
      variant: action.variant,
      disabled: evaluateRowPredicate(action.disabled, row, false),
    }));
}

function isPlainTextContent(content: ReactNode): content is string | number {
  return typeof content === 'string' || typeof content === 'number';
}

interface DelegatedRowTarget {
  row: HTMLElement;
  rowId: string;
}

function getDelegatedRowTarget(
  event: KeyboardEvent<HTMLElement> | MouseEvent<HTMLElement>
): DelegatedRowTarget | null {
  const target = event.target;
  if (!(target instanceof Element)) {
    return null;
  }
  if (target.closest(INTERACTIVE_ROW_TARGET_SELECTOR)) {
    return null;
  }
  const row = target.closest<HTMLElement>(`[${ROW_ID_ATTRIBUTE}]`);
  if (!row || !event.currentTarget.contains(row)) {
    return null;
  }
  const rowId = row.getAttribute(ROW_ID_ATTRIBUTE);
  return rowId ? { row, rowId } : null;
}

interface FolderTableBodyRowProps<T extends FolderTableRow> {
  columns: FolderTableColumn<T>[];
  checkboxDisabled: boolean;
  checkboxHidden: boolean;
  onCheckboxChange: (rowId: string, selected: boolean, shiftKey: boolean) => void;
  isLoadMoreRow: boolean;
  isCheckboxSelected: boolean;
  isSelected: boolean;
  showCheckboxSelection: boolean;
  renderCellContent: (
    column: FolderTableColumn<T>,
    row: FolderTableVisibleRow & T,
    ctx: FolderTableRowContext<T>
  ) => ReactNode;
  resolveBodyCellClass: (column: FolderTableColumn<T>) => string;
  row: FolderTableVisibleRow & T;
  renderRow?: (
    rowElement: ReactElement,
    row: FolderTableVisibleRow & T,
    ctx: FolderTableRowContext<T>
  ) => ReactNode;
}

function areBodyRowPropsEqual<T extends FolderTableRow>(
  prev: FolderTableBodyRowProps<T>,
  next: FolderTableBodyRowProps<T>
): boolean {
  return (
    prev.row === next.row &&
    prev.columns === next.columns &&
    prev.checkboxDisabled === next.checkboxDisabled &&
    prev.checkboxHidden === next.checkboxHidden &&
    prev.onCheckboxChange === next.onCheckboxChange &&
    prev.isLoadMoreRow === next.isLoadMoreRow &&
    prev.isCheckboxSelected === next.isCheckboxSelected &&
    prev.isSelected === next.isSelected &&
    prev.showCheckboxSelection === next.showCheckboxSelection &&
    prev.renderCellContent === next.renderCellContent &&
    prev.resolveBodyCellClass === next.resolveBodyCellClass &&
    prev.renderRow === next.renderRow
  );
}

function FolderTableBodyRowBase<T extends FolderTableRow>({
  columns,
  checkboxDisabled,
  checkboxHidden,
  onCheckboxChange,
  isLoadMoreRow,
  isCheckboxSelected,
  isSelected,
  showCheckboxSelection,
  renderCellContent,
  resolveBodyCellClass,
  row,
  renderRow,
}: FolderTableBodyRowProps<T>) {
  const { t } = useTranslation('table');
  const rowId = row.id;
  const ctx: FolderTableRowContext<T> = {
    row,
    rowId,
    depth: row.depth,
  };

  const rowElement = (
    <Table.Row
      id={rowId}
      textValue={row.name}
      data-folder-row-id={rowId}
      data-selected={isSelected ? 'true' : undefined}
      className={joinClassNames(
        styles.bodyRow,
        isSelected ? styles.selectedRow : undefined,
        isLoadMoreRow ? styles.inlineLoadMoreRow : undefined
      )}
    >
      {showCheckboxSelection ? (
        <Table.Cell className={joinClassNames(styles.checkboxCell, tableStyles.colCheckbox)}>
          {!checkboxHidden ? (
            <div
              className={joinClassNames(
                tableCellStyles.cellContentHostCenter,
                styles.checkboxCellInner
              )}
            >
              <TableSelectionCheckbox
                ariaLabel={t('aria.selectRow', { id: rowId })}
                isSelected={isCheckboxSelected}
                isDisabled={checkboxDisabled}
                onChange={(selected, shiftKey) => onCheckboxChange(rowId, selected, shiftKey)}
              />
            </div>
          ) : null}
        </Table.Cell>
      ) : null}
      {columns.map((column) => {
        const cellContent = renderCellContent(column, row, ctx);
        return (
          <Table.Cell key={column.id} className={resolveBodyCellClass(column)}>
            <div className={styles.cellSurface}>
              <TableCellAlign
                align={column.isActionColumn ? 'center' : resolveColumnAlign(column.align)}
                stretch={shouldStretchTableCellContent(column)}
              >
                {column.isNameColumn || column.isActionColumn ? (
                  cellContent
                ) : isPlainTextContent(cellContent) ? (
                  <TableTextCell muted>{cellContent}</TableTextCell>
                ) : (
                  cellContent
                )}
              </TableCellAlign>
            </div>
          </Table.Cell>
        );
      })}
    </Table.Row>
  );

  return renderRow ? renderRow(rowElement, row, ctx) : rowElement;
}

const FolderTableBodyRow = memo(
  FolderTableBodyRowBase,
  areBodyRowPropsEqual
) as typeof FolderTableBodyRowBase;

function FolderTable<T extends FolderTableRow>({
  ariaLabel,
  items,
  columns: columnsProp,
  loading = false,
  breadcrumb,
  toolbar,
  expandedRowKeys = [],
  onExpandedChange,
  selectedRowKey,
  onRowSelect,
  onRowActivate,
  renderEntryIcon,
  renderNameContent,
  renderRow,
  bodyDragHandlers,
  bodyOverlay,
  rowActions,
  loadMore,
  totalCount,
  summary,
  maxBodyHeight,
  emptyText,
  emptyDescription,
  emptyIcon,
  skeletonRowCount = 4,
  className,
  sortDescriptor,
  onSortChange,
  isPinnedFirst,
  isEditMode = false,
  checkboxSelection,
  selectionFooter,
}: FolderTableProps<T>) {
  const { t, i18n } = useTranslation('table');
  const sortLocale = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  const resolvedEmptyText = emptyText ?? t('empty.folderEmpty');
  const resolvedEmptyDescription = emptyDescription ?? t('empty.folderDescription');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement | HTMLTableSectionElement | null>(null);
  const loadMoreLockRef = useRef(false);
  const selectionAnchorRef = useRef<string | undefined>(undefined);

  const columns = columnsProp ?? (createDefaultFolderColumns<T>(t) as FolderTableColumn<T>[]);
  const eqLayout = isFolderEqLayout(columns);
  const eqColumnCount = countFolderEqColumns(columns);

  const expandedKeySet = new Set(expandedRowKeys);
  const selectedEditRowKeySet = new Set(
    checkboxSelection ? [...checkboxSelection.selectedKeys].map(String) : []
  );
  const selectedRowKeySet = isEditMode
    ? selectedEditRowKeySet
    : new Set(selectedRowKey ? [selectedRowKey] : []);

  const sortedItems = sortFolderTreeRows(
    items,
    columns,
    sortDescriptor,
    (row) => ({ row, rowId: row.id, depth: 0 }),
    {
      isPinnedFirst,
      isPinnedLast: (row) => row.entryType === 'loading',
      locale: sortLocale,
    }
  );

  const visibleRows = flattenFolderRows(sortedItems, expandedKeySet);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual 官方 hook 与 React Compiler 的兼容提示，当前组件需要虚拟滚动能力。
  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => bodyScrollRef.current,
    estimateSize: () => VIRTUAL_ROW_ESTIMATE_SIZE,
    overscan: VIRTUAL_ROW_OVERSCAN,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualTopPadding = virtualRows[0]?.start ?? 0;
  const virtualBottomPadding =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;
  const visibleRowMap = (() => {
    const map = new Map<string, FolderTableVisibleRow & T>();
    for (const row of visibleRows) {
      map.set(row.id, row as FolderTableVisibleRow & T);
    }
    return map;
  })();

  const showSkeletonBody = loading && items.length === 0;
  const showEmptyState = !loading && visibleRows.length === 0;
  const showCheckboxSelection = Boolean(checkboxSelection);
  const disabledKeys = (() => {
    const keys = new Set<string>();
    if (checkboxSelection?.disabledKeys) {
      for (const key of checkboxSelection.disabledKeys) {
        keys.add(String(key));
      }
    }
    return keys;
  })();
  const hiddenKeys = (() => {
    const keys = new Set<string>();
    if (checkboxSelection?.hiddenKeys) {
      for (const key of checkboxSelection.hiddenKeys) {
        keys.add(String(key));
      }
    }
    return keys;
  })();
  const selectableVisibleRowIds = visibleRows
    .filter(
      (row) => row.entryType !== 'loading' && !disabledKeys.has(row.id) && !hiddenKeys.has(row.id)
    )
    .map((row) => row.id);
  const visualSelectedEditRowKeySet = buildVisualSelectedRowKeySet(
    visibleRows,
    selectedEditRowKeySet,
    disabledKeys,
    hiddenKeys
  );
  const selectedVisibleCount = selectableVisibleRowIds.filter((id) =>
    visualSelectedEditRowKeySet.has(id)
  ).length;
  const allVisibleSelected =
    selectableVisibleRowIds.length > 0 && selectedVisibleCount === selectableVisibleRowIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;
  const showSelectionFooter = Boolean(checkboxSelection && selectionFooter);

  const defaultSummary = (() => {
    if (summary !== undefined) {
      return summary;
    }
    const count = totalCount ?? items.length;
    return count > 0 ? t('summary.totalItems', { count }) : t('summary.totalItemsZero');
  })();

  const showFooter = !showSkeletonBody && Boolean(defaultSummary) && !showSelectionFooter;

  const handleSelectionChange = (rowId: string, selected: boolean, shiftKey: boolean) => {
    if (
      !checkboxSelection ||
      disabledKeys.has(rowId) ||
      hiddenKeys.has(rowId) ||
      !selectableVisibleRowIds.includes(rowId)
    ) {
      return;
    }

    let nextKeys = new Set(selectedEditRowKeySet);
    const anchorId = selectionAnchorRef.current;
    const anchorIndex = anchorId ? selectableVisibleRowIds.indexOf(anchorId) : -1;
    const rowIndex = selectableVisibleRowIds.indexOf(rowId);
    const applyRowSelection = (id: string) => {
      const row = visibleRowMap.get(id);
      if (selected) {
        nextKeys.add(id);
        if (row && isFolderContainerRow(row)) {
          collectDescendantSelectableRowIds(row, disabledKeys, hiddenKeys).forEach((descendantId) =>
            nextKeys.delete(descendantId)
          );
        }
        return;
      }
      nextKeys.delete(id);
      if (row && isFolderContainerRow(row)) {
        collectDescendantSelectableRowIds(row, disabledKeys, hiddenKeys).forEach((descendantId) =>
          nextKeys.delete(descendantId)
        );
      }
    };

    if (shiftKey && anchorIndex >= 0 && rowIndex >= 0) {
      const start = Math.min(anchorIndex, rowIndex);
      const end = Math.max(anchorIndex, rowIndex);
      selectableVisibleRowIds.slice(start, end + 1).forEach(applyRowSelection);
    } else {
      applyRowSelection(rowId);
    }

    nextKeys = normalizeTreeSelection(sortedItems, nextKeys, disabledKeys, hiddenKeys);
    selectionAnchorRef.current = rowId;
    checkboxSelection.onSelectionChange(nextKeys);
  };

  const handleToggleAll = () => {
    if (!checkboxSelection) {
      return;
    }
    let nextKeys = new Set(selectedEditRowKeySet);
    selectableVisibleRowIds.forEach((id) => {
      if (allVisibleSelected) {
        nextKeys.delete(id);
      } else {
        nextKeys.add(id);
      }
    });
    nextKeys = normalizeTreeSelection(sortedItems, nextKeys, disabledKeys, hiddenKeys);
    selectionAnchorRef.current = undefined;
    checkboxSelection.onSelectionChange(nextKeys);
  };

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    if (!loadMore) {
      return;
    }

    if (!loadMore.loading) {
      loadMoreLockRef.current = false;
    }

    if (loadMore.loading || !loadMore.hasMore || loadMoreLockRef.current) {
      return;
    }

    const container = event.currentTarget;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceToBottom > LOAD_MORE_THRESHOLD_PX) {
      return;
    }

    loadMoreLockRef.current = true;
    loadMore.onLoadMore();
  };

  const scrollContainerProps = (() => {
    if (!maxBodyHeight) {
      return {};
    }
    const resolved = resolveMaxBodyHeight(maxBodyHeight);
    return {
      style: { maxHeight: resolved } as CSSProperties,
    };
  })();

  const handleToggleExpand = (rowId: string) => {
    if (!onExpandedChange) {
      return;
    }
    const isCollapsing = expandedRowKeys.includes(rowId);
    if (isCollapsing && checkboxSelection) {
      const rowIndex = visibleRows.findIndex((row) => row.id === rowId);
      const rowDepth = visibleRows[rowIndex]?.depth;
      if (rowIndex >= 0 && rowDepth !== undefined) {
        const descendantIds = new Set<string>();
        for (let index = rowIndex + 1; index < visibleRows.length; index += 1) {
          const row = visibleRows[index];
          if (row.depth <= rowDepth) break;
          descendantIds.add(row.id);
        }
        if (descendantIds.size > 0) {
          const nextSelectedKeys = new Set(selectedEditRowKeySet);
          let selectionChanged = false;
          descendantIds.forEach((id) => {
            selectionChanged = nextSelectedKeys.delete(id) || selectionChanged;
          });
          if (selectionAnchorRef.current && descendantIds.has(selectionAnchorRef.current)) {
            selectionAnchorRef.current = undefined;
          }
          if (selectionChanged) {
            checkboxSelection.onSelectionChange(nextSelectedKeys);
          }
        }
      }
    }
    const next = isCollapsing
      ? expandedRowKeys.filter((key) => key !== rowId)
      : [...expandedRowKeys, rowId];
    onExpandedChange(next);
  };

  const handleRowAction = (row: T, actionKey: string) => {
    const matched = resolveRowActions(row, rowActions).find((action) => action.key === actionKey);
    matched?.onPress(row);
  };

  const handleRowPress = (row: T) => {
    if (onRowSelect) {
      onRowSelect(row);
      return;
    }
    onRowActivate?.(row);
  };

  const handleDelegatedRowPress = (rowId: string, shiftKey: boolean) => {
    const row = visibleRowMap.get(rowId);
    if (!row) {
      return;
    }
    if (isEditMode) {
      handleSelectionChange(rowId, !visualSelectedEditRowKeySet.has(rowId), shiftKey);
      return;
    }
    handleRowPress(row as T);
  };

  const handleBodyClick = (event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented) {
      return;
    }
    const target = getDelegatedRowTarget(event);
    if (!target) {
      return;
    }
    handleDelegatedRowPress(target.rowId, event.shiftKey);
  };

  const handleBodyDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || isEditMode || !onRowSelect) {
      return;
    }
    const target = getDelegatedRowTarget(event);
    if (!target) {
      return;
    }
    const row = visibleRowMap.get(target.rowId);
    if (row) {
      onRowActivate?.(row as T);
    }
  };

  const handleBodyKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented) {
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const target = getDelegatedRowTarget(event);
    if (!target) {
      return;
    }
    event.preventDefault();
    handleDelegatedRowPress(target.rowId, event.shiftKey);
  };

  const renderCellContent = (
    column: FolderTableColumn<T>,
    row: FolderTableVisibleRow & T,
    ctx: FolderTableRowContext<T>
  ) => {
    if (column.isNameColumn) {
      if (row.entryType === 'loading') {
        return (
          <span
            className={styles.inlineLoadMoreButton}
            style={resolveFolderDepthIndentStyle(row.depth)}
          >
            {row.name || t('loadMore')}
          </span>
        );
      }

      const expandable = folderRowHasChildren(row);
      const expanded = expandedKeySet.has(row.id);
      return (
        <FolderTableNameCell<T>
          row={row}
          depth={row.depth}
          expanded={expanded}
          expandable={expandable}
          renderEntryIcon={renderEntryIcon}
          renderNameContent={renderNameContent}
          onToggleExpand={
            expandable && onExpandedChange ? () => handleToggleExpand(row.id) : undefined
          }
        />
      );
    }

    if (column.isActionColumn) {
      const menuActions = toMenuActions(resolveRowActions(ctx.row, rowActions), ctx.row);
      if (row.entryType === 'loading' || menuActions.length === 0) {
        return null;
      }
      return (
        <TableRowActions actions={menuActions} onAction={(key) => handleRowAction(ctx.row, key)} />
      );
    }

    if (column.renderCell) {
      return column.renderCell(ctx.row, ctx);
    }

    return null;
  };

  const resolveColumnHeaderClass = (column: FolderTableColumn<T>) =>
    joinClassNames(
      resolveFolderColumnWidthClassForColumn(column, eqLayout),
      column.isNameColumn ? styles.nameColumnHeader : undefined,
      column.isActionColumn ? styles.actionColumnHeader : undefined,
      column.className
    );

  const resolveHeaderAlign = (column: FolderTableColumn<T>) =>
    column.isNameColumn
      ? 'start'
      : column.isActionColumn
        ? 'center'
        : resolveColumnAlign(column.align);

  const resolveBodyCellClass = (column: FolderTableColumn<T>) =>
    joinClassNames(
      resolveFolderColumnWidthClassForColumn(column, eqLayout),
      column.isActionColumn ? styles.actionCell : styles.bodyCell,
      column.isNameColumn ? styles.nameCell : undefined,
      !column.isNameColumn && !column.isActionColumn ? styles.mutedCell : undefined,
      column.className
    );

  return (
    <div
      className={joinClassNames(styles.shell, className)}
      data-edit-mode={isEditMode ? 'true' : undefined}
    >
      {breadcrumb || toolbar ? (
        <div className={styles.headerBar}>
          {breadcrumb ? (
            <div className={styles.breadcrumb}>{breadcrumb}</div>
          ) : (
            <div className={styles.headerBarSpacer} aria-hidden />
          )}
          {toolbar ? <div className={styles.toolbar}>{toolbar}</div> : null}
        </div>
      ) : null}

      <Table variant="secondary" className={styles.tableRoot}>
        <Table.ScrollContainer
          ref={scrollRef}
          className={styles.scrollContainer}
          onClick={handleBodyClick}
          onDoubleClick={handleBodyDoubleClick}
          onKeyDown={handleBodyKeyDown}
          onDragEnter={bodyDragHandlers?.onDragEnter}
          onDragOver={bodyDragHandlers?.onDragOver}
          onDragLeave={bodyDragHandlers?.onDragLeave}
          onDrop={bodyDragHandlers?.onDrop}
          {...scrollContainerProps}
        >
          {bodyOverlay ? <div className={styles.bodyOverlay}>{bodyOverlay}</div> : null}
          {showEmptyState ? (
            <div className={styles.emptyStateOverlay}>
              <TableBodyState
                title={resolvedEmptyText}
                description={resolvedEmptyDescription}
                icon={emptyIcon ?? <Folder size={20} aria-hidden />}
              />
            </div>
          ) : null}
          <Table.Content
            aria-label={ariaLabel}
            className={styles.tableContent}
            data-eq-count={eqColumnCount}
            sortDescriptor={sortDescriptor}
            onSortChange={onSortChange}
          >
            <Table.Header>
              {checkboxSelection ? (
                <Table.Column
                  className={joinClassNames(styles.checkboxColumn, tableStyles.colCheckbox)}
                  id="__selection"
                >
                  <div
                    className={joinClassNames(
                      tableCellStyles.cellContentHostCenter,
                      styles.checkboxColumnInner
                    )}
                  >
                    {isEditMode ? (
                      <TableSelectionCheckbox
                        ariaLabel={t('aria.selectAll')}
                        isSelected={allVisibleSelected}
                        isIndeterminate={someVisibleSelected}
                        isDisabled={selectableVisibleRowIds.length === 0}
                        onChange={() => handleToggleAll()}
                      />
                    ) : null}
                  </div>
                </Table.Column>
              ) : null}
              {columns.map((column) => (
                <Table.Column
                  key={column.id}
                  id={column.id}
                  allowsSorting={column.allowsSorting}
                  isRowHeader={column.isRowHeader ?? column.isNameColumn}
                  className={resolveColumnHeaderClass(column)}
                >
                  {({ sortDirection }) => (
                    <TableCellAlign align={resolveHeaderAlign(column)}>
                      {renderSortableColumnLabel(
                        column.label,
                        sortDirection,
                        column.allowsSorting,
                        resolveHeaderAlign(column)
                      )}
                    </TableCellAlign>
                  )}
                </Table.Column>
              ))}
            </Table.Header>

            <Table.Body ref={bodyScrollRef} onScroll={handleScroll}>
              {showSkeletonBody ? (
                <FolderTableLoadingSkeleton
                  rowCount={skeletonRowCount}
                  columns={columns}
                  eqLayout={eqLayout}
                  showCheckboxSelection={showCheckboxSelection}
                />
              ) : (
                <>
                  {virtualTopPadding > 0 ? (
                    <Table.Row id="__virtual_top" textValue="" className={styles.virtualSpacerRow}>
                      <Table.Cell
                        colSpan={columns.length + (showCheckboxSelection ? 1 : 0)}
                        className={styles.virtualSpacerCell}
                        style={{ height: virtualTopPadding } as CSSProperties}
                      />
                    </Table.Row>
                  ) : null}
                  {virtualRows.map((virtualRow) => {
                    const row = visibleRows[virtualRow.index];
                    if (!row) return null;
                    const rowId = row.id;
                    const isLoadMoreRow = row.entryType === 'loading';
                    const isSelected = isEditMode
                      ? visualSelectedEditRowKeySet.has(rowId)
                      : selectedRowKeySet.has(rowId);
                    const isCheckboxSelected = visualSelectedEditRowKeySet.has(rowId);

                    return (
                      <FolderTableBodyRow
                        key={rowId}
                        columns={columns}
                        checkboxDisabled={isLoadMoreRow || disabledKeys.has(rowId)}
                        checkboxHidden={hiddenKeys.has(rowId)}
                        onCheckboxChange={handleSelectionChange}
                        isLoadMoreRow={isLoadMoreRow}
                        isCheckboxSelected={isCheckboxSelected}
                        isSelected={isSelected}
                        showCheckboxSelection={showCheckboxSelection}
                        renderCellContent={renderCellContent}
                        resolveBodyCellClass={resolveBodyCellClass}
                        row={row as FolderTableVisibleRow & T}
                        renderRow={renderRow}
                      />
                    );
                  })}
                  {virtualBottomPadding > 0 ? (
                    <Table.Row
                      id="__virtual_bottom"
                      textValue=""
                      className={styles.virtualSpacerRow}
                    >
                      <Table.Cell
                        colSpan={columns.length + (showCheckboxSelection ? 1 : 0)}
                        className={styles.virtualSpacerCell}
                        style={{ height: virtualBottomPadding } as CSSProperties}
                      />
                    </Table.Row>
                  ) : null}
                  {loadMore?.loading ? (
                    <Table.Row
                      id="__load_more"
                      textValue={t('loadMoreRow')}
                      className={styles.loadMoreTableRow}
                    >
                      <Table.Cell
                        colSpan={columns.length + (showCheckboxSelection ? 1 : 0)}
                        className={joinClassNames(styles.loadMoreCell, styles.bodyCell)}
                      >
                        <TableLoadMoreRow />
                      </Table.Cell>
                    </Table.Row>
                  ) : null}
                </>
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>

        {showSelectionFooter ? (
          <TableBatchFooter selectedCount={selectedRowKeySet.size}>
            {selectionFooter}
          </TableBatchFooter>
        ) : showFooter ? (
          <TableSummaryFooter summary={defaultSummary} />
        ) : null}
      </Table>
    </div>
  );
}

const MemoizedFolderTable = memo(FolderTable) as typeof FolderTable;

export default MemoizedFolderTable;
