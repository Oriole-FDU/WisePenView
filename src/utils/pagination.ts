export type PaginationItem = number | 'ellipsis';

export function getTotalPages(total: number, pageSize: number): number {
  return Math.max(Math.ceil(total / pageSize), 1);
}

function range(start: number, end: number): number[] {
  if (end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function insertEllipses(pages: number[]): PaginationItem[] {
  return pages.flatMap((page, index) =>
    index > 0 && page - pages[index - 1] > 1 ? (['ellipsis', page] as PaginationItem[]) : [page]
  );
}

/** 公共列表只保留首尾页和当前页附近，不在边界处扩展页码。 */
export function buildCompactPaginationItems(current: number, totalPages: number): PaginationItem[] {
  const pages = new Set([1, totalPages, ...range(current - 1, current + 1)]);
  return insertEllipses(
    [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)
  );
}

interface ExpandedPaginationOptions {
  siblingCount?: number;
  boundaryCount?: number;
}

/** 表格在首尾附近展开更多页码，并保留原有的自定义边界数量。 */
export function buildExpandedPaginationItems(
  current: number,
  totalPages: number,
  options?: ExpandedPaginationOptions
): PaginationItem[] {
  const siblingCount = options?.siblingCount ?? 1;
  const boundaryCount = options?.boundaryCount ?? 1;

  if (totalPages <= 1) return [1];

  const totalPageNumbers = siblingCount * 2 + 3 + boundaryCount * 2;
  if (totalPages <= totalPageNumbers) return range(1, totalPages);

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
