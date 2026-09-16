import { Table } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import TableCellAlign from '../../../shared/cells/CellAlign';
import { tableStyles } from '../../../shared/styles';
import { joinClassNames, resolveColumnAlign } from '../../../shared/TableBase/cellAlign';
import {
  resolveFolderColumnWidthClassForColumn,
  resolveFolderSkeletonBarWidth,
} from '../../../shared/TableBase/columnWidth';
import folderStyles from '../../style.module.less';
import type { FolderTableLoadingSkeletonProps } from './index.type';
import styles from './style.module.less';

function FolderTableLoadingSkeleton({
  rowCount = 4,
  columns,
  eqLayout = false,
  showCheckboxSelection = false,
}: FolderTableLoadingSkeletonProps) {
  const { t } = useTranslation('table');

  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <Table.Row
          key={`folder-skeleton-${rowIndex}`}
          id={`folder-skeleton-${rowIndex}`}
          textValue={t('loading')}
          className={styles.skeletonRow}
        >
          {showCheckboxSelection ? (
            <Table.Cell
              className={joinClassNames(folderStyles.checkboxCell, tableStyles.colCheckbox)}
            />
          ) : null}
          {columns.map((column) => {
            const barWidth = resolveFolderSkeletonBarWidth(column, eqLayout);

            return (
              <Table.Cell
                key={column.id}
                className={joinClassNames(
                  styles.skeletonCell,
                  resolveFolderColumnWidthClassForColumn(column, eqLayout),
                  column.isNameColumn ? folderStyles.nameCell : undefined,
                  column.isActionColumn ? folderStyles.actionCell : undefined
                )}
              >
                <TableCellAlign
                  align={column.isActionColumn ? 'center' : resolveColumnAlign(column.align)}
                >
                  {column.isNameColumn ? (
                    <div className={styles.nameSkeleton}>
                      <div className={styles.expandSkeleton} />
                      <div className={styles.iconSkeleton} />
                      {barWidth ? (
                        <div
                          className={styles.barSkeleton}
                          data-width={barWidth}
                          data-emphasis="true"
                        />
                      ) : null}
                    </div>
                  ) : column.isActionColumn ? null : barWidth ? (
                    <div className={styles.barSkeleton} data-width={barWidth} />
                  ) : null}
                </TableCellAlign>
              </Table.Cell>
            );
          })}
        </Table.Row>
      ))}
    </>
  );
}

export default FolderTableLoadingSkeleton;
