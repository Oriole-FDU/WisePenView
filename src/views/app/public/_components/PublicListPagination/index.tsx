import { Pagination } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import styles from './style.module.less';

type PaginationPageItem = number | 'ellipsis';

export interface PublicListPaginationProps {
  page: number;
  size: number;
  total: number;
  onChange: (page: number, size: number) => void;
}

const PAGINATION_SIBLING_COUNT = 1;

function buildPaginationItems(currentPage: number, totalPages: number): PaginationPageItem[] {
  const pages = new Set<number>([1, totalPages]);
  for (
    let pageNumber = currentPage - PAGINATION_SIBLING_COUNT;
    pageNumber <= currentPage + PAGINATION_SIBLING_COUNT;
    pageNumber += 1
  ) {
    if (pageNumber > 1 && pageNumber < totalPages) pages.add(pageNumber);
  }

  const sortedPages = [...pages].sort((left, right) => left - right);
  return sortedPages.flatMap((pageNumber, index) => {
    const previousPage = sortedPages[index - 1];
    return previousPage && pageNumber - previousPage > 1
      ? (['ellipsis', pageNumber] as PaginationPageItem[])
      : [pageNumber];
  });
}

function PublicListPagination({ page, size, total, onChange }: PublicListPaginationProps) {
  const { t } = useTranslation('group');
  if (total <= 0) return null;

  const totalPages = Math.max(Math.ceil(total / size), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * size + 1;
  const end = Math.min(safePage * size, total);
  const pages = buildPaginationItems(safePage, totalPages);

  return (
    <div className={styles.wrap}>
      <Pagination size="sm">
        <Pagination.Summary>{t('list.summary', { start, end, total })}</Pagination.Summary>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous
              isDisabled={safePage <= 1}
              onPress={() => onChange(Math.max(1, safePage - 1), size)}
            >
              <Pagination.PreviousIcon />
              {t('list.previous')}
            </Pagination.Previous>
          </Pagination.Item>
          {pages.map((targetPage, index) =>
            targetPage === 'ellipsis' ? (
              <Pagination.Item key={`ellipsis-${index}`}>
                <Pagination.Ellipsis />
              </Pagination.Item>
            ) : (
              <Pagination.Item key={targetPage}>
                <Pagination.Link
                  isActive={targetPage === safePage}
                  onPress={() => onChange(targetPage, size)}
                >
                  {targetPage}
                </Pagination.Link>
              </Pagination.Item>
            )
          )}
          <Pagination.Item>
            <Pagination.Next
              isDisabled={safePage >= totalPages}
              onPress={() => onChange(Math.min(totalPages, safePage + 1), size)}
            >
              {t('list.next')}
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </div>
  );
}

export default PublicListPagination;
