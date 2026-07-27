import { Table } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { joinClassNames, resolveColumnAlign } from '../../../shared/TableBase/cellAlign';
import {
  resolveReadonlyColumnWidthClass,
  resolveReadonlySkeletonBarWidth,
} from '../../../shared/TableBase/columnWidth';
import type { TableColumnWidth } from '../../../shared/TableBase/index.type';
import TableCellAlign from '../../../shared/cells/CellAlign';
import styles from './style.module.less';

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
