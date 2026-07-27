import { Pagination, Table } from '@heroui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TablePaginationFooterProps } from './index.type';
import styles from './style.module.less';

type PaginationItem = number | 'ellipsis';

interface BuildPaginationItemsOptions {
  /** HeroUI v2 siblings */
  siblingCount?: number;
  /** HeroUI v2 boundaries */
  boundaryCount?: number;
}

function range(start: number, end: number): number[] {
  if (end < start) {
    return [];
  }
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/** 页码过多时在中间插入 ellipsis */
function buildPaginationItems(
  current: number,
  totalPages: number,
  options?: BuildPaginationItemsOptions
): PaginationItem[] {
  const siblingCount = options?.siblingCount ?? 1;
  const boundaryCount = options?.boundaryCount ?? 1;

  if (totalPages <= 1) {
    return [1];
  }

  const totalPageNumbers = siblingCount * 2 + 3 + boundaryCount * 2;
  if (totalPages <= totalPageNumbers) {
    return range(1, totalPages);
  }

  const leftSiblingIndex = Math.max(current - siblingCount, 1);
  const rightSiblingIndex = Math.min(current + siblingCount, totalPages);
  const shouldShowLeftEllipsis = leftSiblingIndex > boundaryCount + 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - boundaryCount - 1;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    return [
      ...range(1, leftItemCount),
      'ellipsis',
      ...range(totalPages - boundaryCount + 1, totalPages),
    ];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    return [
      ...range(1, boundaryCount),
      'ellipsis',
      ...range(totalPages - rightItemCount + 1, totalPages),
    ];
  }

  if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    return [
      ...range(1, boundaryCount),
      'ellipsis',
      ...range(leftSiblingIndex, rightSiblingIndex),
      'ellipsis',
      ...range(totalPages - boundaryCount + 1, totalPages),
    ];
  }

  return range(1, totalPages);
}

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
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const pages = buildPaginationItems(current, totalPages, {
    siblingCount,
    boundaryCount,
  });

  return (
    <Table.Footer className={className ?? styles.footer}>
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
