import {
  joinClassNames,
  resolveColumnAlign,
  shouldStretchTableCellContent,
} from '../shared/TableBase/cellAlign';
import {
  getReadonlyEqColumnCount,
  isReadonlyEqualColumnLayout,
  resolveReadonlyColumnWidthClass,
} from '../shared/TableBase/columnWidth';
import { sortTableRows } from '../shared/TableBase/tableSort';
import TableBodyState from '../shared/TableBodyState';
import TablePaginationFooter from '../shared/TablePaginationFooter';
import { renderSortableColumnLabel } from '../shared/TableSortHeader/renderSortableColumnLabel';
import { TableLoadMoreRow, TableRefreshIndicator } from '../shared/TableStatusRows';
import TableSummaryFooter from '../shared/TableSummaryFooter';
import TableCellAlign from '../shared/cells/CellAlign';
import type { DataTableProps, DataTableRowContext } from './index.type';
import styles from './style.module.less';

import { Table } from '@heroui/react';
import { ArrowUpDown } from 'lucide-react';
import { useRef, type CSSProperties, type UIEvent } from 'react';
import { useTranslation } from 'react-i18next';
import DataTableLoadingSkeleton from './parts/LoadingSkeleton';

const LOAD_MORE_THRESHOLD_PX = 48;
function getRowTextValue<T extends object>(row: T, rowKey: keyof T & string): string {
  const value = row[rowKey];
  return value == null ? '' : String(value);
}

function resolveMaxBodyHeight(value: number | string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'number' ? `${value}px` : value;
}

function DataTable<T extends object>({
  ariaLabel,
  items,
  rowKey,
  columns,
  loading = false,
  refreshing = false,
  emptyText,
  emptyDescription,
  emptyIcon,
  skeletonRowCount = 4,
  className,
  maxBodyHeight,
  title,
  tabs,
  toolbar,
  loadMore,
  totalCount,
  pagination,
  summary,
  getRowClassName,
  sortDescriptor,
  onSortChange,
}: DataTableProps<T>) {
  const { t, i18n } = useTranslation('table');
  const sortLocale = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  const resolvedEmptyText = emptyText ?? t('empty.noData');
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreLockRef = useRef(false);

  const showHeaderBar = Boolean(title || toolbar);
  const showSkeletonBody = refreshing || (loading && items.length === 0);
  const showEmptyState = !loading && !refreshing && items.length === 0;

  const defaultSummary = (() => {
    if (summary !== undefined) {
      return summary;
    }
    const count = pagination?.total ?? totalCount ?? items.length;
    return count > 0 ? t('summary.totalRecords', { count }) : t('summary.totalRecordsZero');
  })();

  const showFooter = !showSkeletonBody && (Boolean(defaultSummary) || Boolean(pagination));

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

  const equalColumnLayout = isReadonlyEqualColumnLayout(columns);
  const eqColumnCount = getReadonlyEqColumnCount(columns);

  const sortedItems = sortTableRows(
    items,
    columns,
    sortDescriptor,
    (row) => ({
      row,
      rowId: String(row[rowKey]),
    }),
    { locale: sortLocale }
  );

  return (
    <div className={joinClassNames(styles.shell, className)}>
      {showHeaderBar ? (
        <div className={styles.headerBar}>
          {title ? <div className={styles.title}>{title}</div> : null}
          {!title && toolbar ? <div className={styles.headerBarSpacer} aria-hidden /> : null}
          {toolbar ? (
            <div
              className={joinClassNames(
                styles.toolbar,
                refreshing || loading ? styles.toolbarDisabled : undefined
              )}
            >
              {toolbar}
            </div>
          ) : null}
        </div>
      ) : null}

      {tabs ? <div className={styles.tabsBar}>{tabs}</div> : null}

      {refreshing ? <TableRefreshIndicator /> : null}

      <Table variant="secondary" className={styles.tableRoot}>
        <Table.ScrollContainer
          ref={scrollRef}
          className={styles.scrollContainer}
          {...scrollContainerProps}
        >
          <Table.Content
            aria-label={ariaLabel}
            className={styles.tableContent}
            data-eq-count={eqColumnCount}
            sortDescriptor={sortDescriptor}
            onSortChange={onSortChange}
          >
            <Table.Header>
              {columns.map((column) => {
                const columnAlign = resolveColumnAlign(column.align);

                return (
                  <Table.Column
                    key={column.id}
                    id={column.id}
                    allowsSorting={column.allowsSorting}
                    isRowHeader={column.isRowHeader}
                    className={joinClassNames(
                      resolveReadonlyColumnWidthClass(column.width, equalColumnLayout),
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
            </Table.Header>

            <Table.Body
              onScroll={handleScroll}
              renderEmptyState={() =>
                showEmptyState ? (
                  <TableBodyState
                    title={resolvedEmptyText}
                    description={emptyDescription}
                    icon={emptyIcon ?? <ArrowUpDown size={20} aria-hidden />}
                  />
                ) : null
              }
            >
              {showSkeletonBody ? (
                <DataTableLoadingSkeleton
                  rowCount={skeletonRowCount}
                  columns={columns}
                  equalLayout={equalColumnLayout}
                />
              ) : (
                <>
                  {sortedItems.map((row) => {
                    const rowId = String(row[rowKey]);
                    const ctx: DataTableRowContext<T> = { row, rowId };

                    return (
                      <Table.Row
                        key={rowId}
                        id={rowId}
                        textValue={getRowTextValue(row, rowKey)}
                        className={joinClassNames(styles.bodyRow, getRowClassName?.(row, ctx))}
                      >
                        {columns.map((column) => (
                          <Table.Cell
                            key={column.id}
                            className={joinClassNames(
                              styles.bodyCell,
                              resolveReadonlyColumnWidthClass(column.width, equalColumnLayout),
                              column.className
                            )}
                          >
                            <TableCellAlign
                              align={resolveColumnAlign(column.align)}
                              stretch={shouldStretchTableCellContent(column)}
                            >
                              {column.renderCell(row, ctx)}
                            </TableCellAlign>
                          </Table.Cell>
                        ))}
                      </Table.Row>
                    );
                  })}
                  {loadMore?.loading ? (
                    <Table.Row
                      id="__load_more"
                      textValue={t('loadMoreRow')}
                      className={styles.loadMoreTableRow}
                    >
                      <Table.Cell
                        colSpan={columns.length}
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

        {showFooter && pagination ? (
          <TablePaginationFooter
            summary={defaultSummary}
            total={pagination.total}
            current={pagination.current}
            pageSize={pagination.pageSize}
            onChange={pagination.onChange}
            pageSizeControl={pagination.pageSizeControl}
            className={styles.tableFooter}
          />
        ) : showFooter ? (
          <TableSummaryFooter summary={defaultSummary} className={styles.tableFooter} />
        ) : null}
      </Table>
    </div>
  );
}

export default DataTable;
