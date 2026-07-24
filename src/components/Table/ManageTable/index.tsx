import AppIconButton from '@/components/Button/AppIconButton';
import {
  joinClassNames,
  resolveColumnAlign,
  shouldStretchTableCellContent,
} from '../shared/TableBase/cellAlign';
import { resolveManageColumnWidthClass } from '../shared/TableBase/columnWidth';
import { resolveSelectedCount } from '../shared/TableBase/tableSelection';
import { sortTableRows } from '../shared/TableBase/tableSort';
import TableBodyState from '../shared/TableBodyState';
import TablePaginationFooter from '../shared/TablePaginationFooter';
import TableRowActions from '../shared/TableRowActions';
import type { TableRowActionItem } from '../shared/TableRowActions/index.type';
import TableSelectionCheckbox from '../shared/TableSelectionCheckbox';
import { renderSortableColumnLabel } from '../shared/TableSortHeader/renderSortableColumnLabel';
import TableCellAlign from '../shared/cells/CellAlign';
import { tableCellStyles, tableStyles } from '../shared/styles';
import type {
  ManageTableInlineEdit,
  ManageTableProps,
  ManageTableRowAction,
  ManageTableRowContext,
  ManageTableRowState,
} from './index.type';
import TableBatchFooter from './parts/BatchFooter';
import TableEditErrorToast from './parts/EditErrorToast';
import styles from './style.module.less';

import { Spinner, Table, type Selection } from '@heroui/react';
import { Check, X } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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

function resolveRowState<T>(
  rowId: string,
  inlineEdit: ManageTableInlineEdit<T> | undefined
): ManageTableRowState {
  if (!inlineEdit) {
    return 'default';
  }
  if (inlineEdit.savingRowId === rowId) {
    return 'saving';
  }
  if (inlineEdit.errorRowId === rowId) {
    return 'error';
  }
  if (inlineEdit.editingRowId === rowId) {
    return 'editing';
  }
  return 'default';
}

function resolveRowActions<T extends object>(
  row: T,
  rowActions: ManageTableProps<T>['rowActions']
): ManageTableRowAction<T>[] {
  if (!rowActions) {
    return [];
  }
  return typeof rowActions === 'function' ? rowActions(row) : rowActions;
}

function toMenuActions<T>(actions: ManageTableRowAction<T>[], row: T): TableRowActionItem[] {
  return actions
    .filter((action) => evaluateRowPredicate(action.visible, row))
    .map((action) => ({
      key: action.key,
      label: action.label,
      variant: action.variant,
      disabled: evaluateRowPredicate(action.disabled, row, false),
    }));
}

function getRowTextValue<T extends object>(row: T, rowKey: keyof T & string): string {
  const value = row[rowKey];
  return value == null ? '' : String(value);
}

function ManageTable<T extends object>({
  ariaLabel,
  items,
  rowKey,
  columns,
  loading = false,
  emptyText,
  emptyDescription,
  emptyIcon,
  loadingText,
  className,
  title,
  toolbar,
  rowActions,
  renderRowActions,
  batchSelection,
  batchFooter,
  inlineEdit,
  pagination,
  sortDescriptor,
  onSortChange,
  getRowClassName,
}: ManageTableProps<T>) {
  const { t } = useTranslation('table');
  const resolvedEmptyText = emptyText ?? t('empty.noData');
  const resolvedLoadingText = loadingText ?? t('loading');

  const disabledKeys = useMemo(
    () => (batchSelection?.disabledKeys ? new Set(batchSelection.disabledKeys) : undefined),
    [batchSelection]
  );

  const defaultSummary = useMemo(() => {
    if (!pagination) {
      return undefined;
    }
    if (pagination.summary !== undefined) {
      return pagination.summary;
    }
    return pagination.total > 0
      ? t('summary.totalItems', { count: pagination.total })
      : t('summary.totalItemsZero');
  }, [pagination, t]);

  const renderActionCell = useCallback(
    (row: T, ctx: ManageTableRowContext<T>) => {
      if (renderRowActions) {
        return renderRowActions(row, ctx);
      }

      if (ctx.state === 'editing' || ctx.state === 'error') {
        return (
          <div className={styles.inlineEditActions}>
            <AppIconButton
              icon={<Check size={16} aria-hidden="true" />}
              label={t('aria.save')}
              size="sm"
              variant="primary"
              onPress={() => {
                void inlineEdit?.onSave(row);
              }}
            />
            <AppIconButton
              icon={<X size={16} aria-hidden="true" />}
              label={t('aria.cancel')}
              size="sm"
              onPress={inlineEdit?.onCancel}
            />
          </div>
        );
      }

      if (ctx.state === 'saving') {
        return (
          <div className={styles.inlineEditActions}>
            <AppIconButton
              icon={<Spinner size="sm" />}
              label={t('aria.saving')}
              size="sm"
              variant="primary"
              isDisabled
            />
            <AppIconButton
              icon={<X size={16} aria-hidden="true" />}
              label={t('aria.cancel')}
              size="sm"
              isDisabled
            />
          </div>
        );
      }

      const actions = resolveRowActions(row, rowActions);
      const menuItems = toMenuActions(actions, row);
      if (menuItems.length === 0) {
        return null;
      }

      return (
        <TableRowActions
          actions={menuItems}
          onAction={(key) => {
            const matched = actions.find((action) => action.key === key);
            matched?.onPress(row);
          }}
        />
      );
    },
    [inlineEdit, renderRowActions, rowActions, t]
  );

  const showHeaderBar = Boolean(title || toolbar);
  const showEditErrorToast = Boolean(inlineEdit?.errorMessage);
  const showBatchFooter = Boolean(batchSelection && batchFooter);
  const selectedCount = resolveSelectedCount(batchSelection?.selectedKeys, items.length);
  const selectableRowIds = useMemo(
    () =>
      batchSelection
        ? items.map((row) => String(row[rowKey])).filter((rowId) => !disabledKeys?.has(rowId))
        : [],
    [batchSelection, disabledKeys, items, rowKey]
  );
  const selectedRowIdSet = useMemo(
    () =>
      new Set(
        batchSelection?.selectedKeys === 'all'
          ? selectableRowIds
          : Array.from(batchSelection?.selectedKeys ?? [], String)
      ),
    [batchSelection, selectableRowIds]
  );
  const selectedSelectableRowCount = selectableRowIds.filter((rowId) =>
    selectedRowIdSet.has(rowId)
  ).length;
  const allRowsSelected =
    selectableRowIds.length > 0 && selectedSelectableRowCount === selectableRowIds.length;
  const someRowsSelected = selectedSelectableRowCount > 0 && !allRowsSelected;

  const sortedItems = useMemo(
    () =>
      sortTableRows(items, columns, sortDescriptor, (row) => {
        const rowId = String(row[rowKey]);
        return { row, rowId, state: resolveRowState(rowId, inlineEdit) };
      }),
    [columns, inlineEdit, items, rowKey, sortDescriptor]
  );

  const handleBatchSelectionChange = useCallback(
    (keys: Selection) => {
      if (!batchSelection) {
        return;
      }
      if (keys === 'all') {
        batchSelection.onSelectionChange('all');
        return;
      }
      batchSelection.onSelectionChange(keys);
    },
    [batchSelection]
  );

  const handleRowCheckboxChange = useCallback(
    (rowId: string, selected: boolean) => {
      if (!batchSelection || disabledKeys?.has(rowId)) {
        return;
      }
      const nextKeys = new Set(selectedRowIdSet);
      if (selected) {
        nextKeys.add(rowId);
      } else {
        nextKeys.delete(rowId);
      }
      batchSelection.onSelectionChange(nextKeys);
    },
    [batchSelection, disabledKeys, selectedRowIdSet]
  );

  const handleSelectAllCheckboxChange = useCallback(
    (selected: boolean) => {
      if (!batchSelection) {
        return;
      }
      const nextKeys = new Set(selectedRowIdSet);
      selectableRowIds.forEach((rowId) => {
        if (selected) {
          nextKeys.add(rowId);
        } else {
          nextKeys.delete(rowId);
        }
      });
      batchSelection.onSelectionChange(nextKeys);
    },
    [batchSelection, selectableRowIds, selectedRowIdSet]
  );

  return (
    <div className={joinClassNames(styles.shell, className)}>
      {showEditErrorToast ? (
        <TableEditErrorToast
          message={inlineEdit?.errorMessage}
          onDismiss={inlineEdit?.onDismissError}
        />
      ) : null}
      {showHeaderBar ? (
        <div className={styles.headerBar}>
          {title ? <div className={styles.title}>{title}</div> : null}
          {title && toolbar ? <div className={styles.headerDivider} aria-hidden /> : null}
          {!title && toolbar ? <div className={styles.headerBarSpacer} aria-hidden /> : null}
          {toolbar ? (
            <div
              className={joinClassNames(
                styles.toolbar,
                title ? styles.toolbarGrow : styles.toolbarEnd
              )}
            >
              {toolbar}
            </div>
          ) : null}
        </div>
      ) : null}

      <Table variant="secondary" className={styles.tableRoot}>
        <Table.ScrollContainer className={styles.scrollContainer}>
          <Table.Content
            aria-label={ariaLabel}
            className={styles.tableContent}
            data-has-selection={batchSelection ? 'true' : undefined}
            selectionMode={batchSelection ? 'multiple' : undefined}
            selectedKeys={batchSelection?.selectedKeys}
            onSelectionChange={batchSelection ? handleBatchSelectionChange : undefined}
            disabledKeys={disabledKeys}
            sortDescriptor={sortDescriptor}
            onSortChange={onSortChange}
          >
            <Table.Header>
              {batchSelection ? (
                <Table.Column
                  className={joinClassNames(
                    styles.checkboxColumn,
                    styles.stickyCheckboxColumn,
                    tableStyles.colCheckbox
                  )}
                  id="__selection"
                >
                  <div
                    className={joinClassNames(
                      tableCellStyles.cellContentHostCenter,
                      styles.checkboxColumnInner
                    )}
                  >
                    <TableSelectionCheckbox
                      ariaLabel={t('aria.selectAll')}
                      isSelected={allRowsSelected}
                      isIndeterminate={someRowsSelected}
                      isDisabled={selectableRowIds.length === 0}
                      onChange={handleSelectAllCheckboxChange}
                    />
                  </div>
                </Table.Column>
              ) : null}
              {columns.map((column) => {
                const columnAlign = resolveColumnAlign(column.align);

                return (
                  <Table.Column
                    key={column.id}
                    id={column.id}
                    allowsSorting={column.allowsSorting}
                    isRowHeader={column.isRowHeader}
                    className={joinClassNames(
                      resolveManageColumnWidthClass(column.width),
                      column.isRowHeader ? styles.stickyRowHeaderColumn : undefined,
                      column.className
                    )}
                  >
                    <TableCellAlign align={columnAlign}>
                      {renderSortableColumnLabel(
                        column.label,
                        column.id,
                        sortDescriptor,
                        column.allowsSorting
                      )}
                    </TableCellAlign>
                  </Table.Column>
                );
              })}
              <Table.Column
                id="__actions"
                className={joinClassNames(
                  styles.actionColumnHeader,
                  styles.stickyActionColumn,
                  tableStyles.colAction
                )}
              >
                <TableCellAlign align="center" className={styles.actionColumnHeaderInner}>
                  <span className={styles.actionColumnHeaderLabel}>{t('column.actions')}</span>
                </TableCellAlign>
              </Table.Column>
            </Table.Header>

            <Table.Body
              renderEmptyState={() =>
                loading ? (
                  <TableBodyState loading title={resolvedLoadingText} />
                ) : (
                  <TableBodyState
                    title={resolvedEmptyText}
                    description={emptyDescription}
                    icon={emptyIcon}
                  />
                )
              }
            >
              {sortedItems.map((row) => {
                const rowId = String(row[rowKey]);
                const state = resolveRowState(rowId, inlineEdit);
                const ctx: ManageTableRowContext<T> = { row, rowId, state };
                const isEditingRow = state === 'editing' || state === 'saving' || state === 'error';
                const isSavingRow = state === 'saving';

                return (
                  <Table.Row
                    key={rowId}
                    id={rowId}
                    textValue={getRowTextValue(row, rowKey)}
                    className={joinClassNames(
                      styles.bodyRow,
                      isEditingRow ? styles.bodyRowEditing : undefined,
                      getRowClassName?.(row, ctx)
                    )}
                  >
                    {batchSelection ? (
                      <Table.Cell
                        className={joinClassNames(
                          styles.checkboxCell,
                          styles.stickyCheckboxCell,
                          tableStyles.colCheckbox
                        )}
                      >
                        <div
                          className={joinClassNames(
                            tableCellStyles.cellContentHostCenter,
                            styles.checkboxCellInner
                          )}
                        >
                          <TableSelectionCheckbox
                            ariaLabel={t('aria.selectRow', { id: rowId })}
                            isSelected={selectedRowIdSet.has(rowId)}
                            isDisabled={disabledKeys?.has(rowId)}
                            onChange={(selected) => handleRowCheckboxChange(rowId, selected)}
                          />
                        </div>
                      </Table.Cell>
                    ) : null}
                    {columns.map((column) => {
                      const cellContent =
                        isEditingRow && column.renderEditCell
                          ? column.renderEditCell(row, ctx)
                          : column.renderCell(row, ctx);

                      return (
                        <Table.Cell
                          key={column.id}
                          data-row-accent={isEditingRow && column.isRowHeader ? 'true' : undefined}
                          className={joinClassNames(
                            styles.bodyCell,
                            resolveManageColumnWidthClass(column.width),
                            column.isRowHeader ? styles.stickyRowHeaderCell : undefined,
                            isSavingRow ? styles.editFieldDisabled : undefined,
                            column.className
                          )}
                        >
                          <TableCellAlign
                            align={resolveColumnAlign(column.align)}
                            stretch={shouldStretchTableCellContent(
                              column,
                              isEditingRow ? 'edit' : 'view'
                            )}
                          >
                            {cellContent}
                          </TableCellAlign>
                        </Table.Cell>
                      );
                    })}
                    <Table.Cell
                      className={joinClassNames(
                        styles.actionCell,
                        styles.stickyActionCell,
                        tableStyles.colAction
                      )}
                    >
                      <div
                        className={joinClassNames(
                          tableCellStyles.cellContentHostCenter,
                          styles.actionCellInner
                        )}
                      >
                        {renderActionCell(row, ctx)}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>

        {showBatchFooter ? (
          <TableBatchFooter selectedCount={selectedCount} className={styles.tableFooter}>
            {batchFooter}
          </TableBatchFooter>
        ) : pagination ? (
          <TablePaginationFooter
            summary={defaultSummary}
            total={pagination.total}
            current={pagination.current}
            pageSize={pagination.pageSize}
            onChange={pagination.onChange}
            pageSizeControl={pagination.pageSizeControl}
            className={styles.tableFooter}
          />
        ) : null}
      </Table>
    </div>
  );
}

export default ManageTable;
