import { Pagination, Table } from '@heroui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { buildExpandedPaginationItems, getTotalPages } from '@/utils/pagination';

import { joinClassNames } from '../TableBase/cellAlign';
import type { TablePaginationFooterProps } from './index.type';
import styles from './style.module.less';

function TablePaginationFooter({
  summary,
  total,
  current,
  pageSize,
  onChange,
  pageSizeControl,
  siblingCount,
  boundaryCount,
  className,
}: TablePaginationFooterProps) {
  const totalPages = getTotalPages(total, pageSize);
  const pages = buildExpandedPaginationItems(current, totalPages, {
    siblingCount,
    boundaryCount,
  });

  return (
    <Table.Footer className={joinClassNames(styles.footer, className)}>
      <div className={styles.footerInner}>
        {summary ? (
          <div className={styles.summary}>{summary}</div>
        ) : (
          <div className={styles.summarySpacer} />
        )}
        <div className={styles.footerControls}>
          <Pagination size="sm" className={styles.pagination}>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={current <= 1}
                  onPress={() => onChange(Math.max(1, current - 1), pageSize)}
                >
                  <ChevronLeft size={16} />
                </Pagination.Previous>
              </Pagination.Item>
              {pages.map((page, index) =>
                page === 'ellipsis' ? (
                  <Pagination.Item key={`ellipsis-${index}`}>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                ) : (
                  <Pagination.Item key={page}>
                    <Pagination.Link
                      isActive={page === current}
                      onPress={() => onChange(page, pageSize)}
                    >
                      {page}
                    </Pagination.Link>
                  </Pagination.Item>
                )
              )}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={current >= totalPages}
                  onPress={() => onChange(Math.min(totalPages, current + 1), pageSize)}
                >
                  <ChevronRight size={16} />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
          {pageSizeControl ? <div className={styles.pageSizeControl}>{pageSizeControl}</div> : null}
        </div>
      </div>
    </Table.Footer>
  );
}

export default TablePaginationFooter;
