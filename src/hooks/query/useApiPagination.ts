import { useState } from 'react';

import { type ApiQueryKey, encodeQueryKey } from './state';
import { type ApiErrorOptions, useApi } from './useApiRequest';

interface PaginationParams {
  current: number;
  pageSize: number;
}

/** 页码分页的条件与页码共同标识结果，切换条件或页码默认隐藏旧页。 */
export function useApiPagination<T extends { list: unknown[]; total: number }>(
  service: (params: PaginationParams) => Promise<T>,
  options: ApiErrorOptions<[PaginationParams]> & {
    queryKey: ApiQueryKey;
    defaultCurrent?: number;
    defaultPageSize?: number;
    ready?: boolean;
    refreshDeps?: readonly unknown[];
    keepPreviousData?: boolean;
  }
) {
  const { queryKey, defaultCurrent = 1, defaultPageSize = 10, refreshDeps, ...rest } = options;
  const key = encodeQueryKey(queryKey);
  const [page, setPage] = useState({ key, current: defaultCurrent, pageSize: defaultPageSize });
  const currentPage = page.key === key ? page : { key, current: 1, pageSize: defaultPageSize };
  if (page.key !== key) setPage(currentPage);
  const { current, pageSize } = currentPage;
  const result = useApi(service, {
    ...rest,
    queryKey: [...queryKey, current, pageSize],
    defaultParams: [{ current, pageSize }],
    refreshDeps,
    isEmpty: (data) => data.list.length === 0,
  });
  const total = result.data?.total ?? 0;
  const onChange = (nextCurrent: number, nextSize = pageSize) => {
    const next = { key, current: Math.max(1, nextCurrent), pageSize: Math.max(1, nextSize) };
    if (next.current === current && next.pageSize === pageSize) result.refresh();
    else setPage(next);
  };

  return {
    ...result,
    pagination: {
      current,
      pageSize,
      total,
      totalPage: Math.ceil(total / pageSize),
      onChange,
      changeCurrent: (next: number) => onChange(next),
      changePageSize: (next: number) => onChange(1, next),
    },
  };
}
