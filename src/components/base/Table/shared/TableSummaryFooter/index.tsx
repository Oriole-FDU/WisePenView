import { Table } from '@heroui/react';

import { joinClassNames } from '../TableBase/cellAlign';
import type { TableSummaryFooterProps } from './index.type';
import styles from './style.module.scss';

function TableSummaryFooter({ summary, className }: TableSummaryFooterProps) {
  if (!summary) {
    return null;
  }

  return (
    <Table.Footer className={joinClassNames(styles.footer, className)}>
      <div className={styles.summary}>{summary}</div>
    </Table.Footer>
  );
}

export default TableSummaryFooter;

export type { TableSummaryFooterProps } from './index.type';
