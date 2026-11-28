import { Table } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import TableCellAlign from '../../../shared/cells/TableCellAlign';
import { joinClassNames, resolveColumnAlign } from '../../../shared/TableBase/cellAlign';
import {
  resolveReadonlyColumnWidthClass,
  resolveReadonlySkeletonBarWidth,
} from '../../../shared/TableBase/columnWidth';
import type { DataTableLoadingSkeletonProps } from './index.type';
import styles from './style.module.scss';

function DataTableLoadingSkeleton({
  rowCount = 4,
  columns,
  equalLayout = false,
}: DataTableLoadingSkeletonProps) {
  const { t } = useTranslation('table');

  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <Table.Row
          key={`skeleton-${rowIndex}`}
          id={`skeleton-${rowIndex}`}
          textValue={t('loading')}
          className={styles.skeletonRow}
        >
          {columns.map((column) => (
            <Table.Cell
              key={column.id}
              className={joinClassNames(
                styles.skeletonCell,
                resolveReadonlyColumnWidthClass(column.width, equalLayout),
                column.className
              )}
            >
              <TableCellAlign align={resolveColumnAlign(column.align)}>
                <div
                  className={styles.skeletonBar}
                  data-width={resolveReadonlySkeletonBarWidth(
                    column.width,
                    equalLayout,
                    column.isRowHeader
                  )}
                  data-emphasis={column.isRowHeader ? 'true' : undefined}
                />
              </TableCellAlign>
            </Table.Cell>
          ))}
        </Table.Row>
      ))}
    </>
  );
}

export default DataTableLoadingSkeleton;

export type { DataTableLoadingSkeletonProps } from './index.type';
