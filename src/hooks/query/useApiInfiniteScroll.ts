import { useEventListener, useMemoizedFn } from 'ahooks';
import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

import { type ApiQueryKey, encodeQueryKey, getQueryState, mergeQueryItems } from './state';
import { type ApiErrorOptions, useApi } from './useApiRequest';

type ListPage = { list: unknown[] };
type PageParams = { page: number; size: number };
type CursorParams<C> = { cursor: C; size: number };
type CommonOptions<T extends ListPage> = ApiErrorOptions<[]> & {
  queryKey: ApiQueryKey;
  pageSize: number;
  getKey: (item: T['list'][number]) => string | number;
  ready?: boolean;
  manual?: boolean;
  refreshDeps?: readonly unknown[];
  target?: RefObject<HTMLElement | null>;
  threshold?: number;
  onSuccess?: (data: T) => void;
};
type PageOptions<T extends ListPage> = CommonOptions<T> & { pagination?: 'page' };
type CursorOptions<T extends ListPage, C> = CommonOptions<T> & {
  pagination: 'cursor';
  initialCursor: C;
  getNextCursor: (page: T, cursor: C) => C | null;
};
interface InfiniteValue<T, C> {
  payload: T;
  pagePayload: T;
  nextCursor: C | null;
  nextPage: number;
}

export function useApiInfiniteScroll<T extends ListPage & { total: number }>(
  service: (params: PageParams) => Promise<T>,
  options: PageOptions<T>
): ReturnType<typeof useInfiniteQuery<T, number>>;
export function useApiInfiniteScroll<T extends ListPage, C>(
  service: (params: CursorParams<C>) => Promise<T>,
  options: CursorOptions<T, C>
): ReturnType<typeof useInfiniteQuery<T, C>>;
export function useApiInfiniteScroll<T extends ListPage, C>(
  service: (params: PageParams & CursorParams<C>) => Promise<T>,
  options: PageOptions<T> | CursorOptions<T, C>
) {
  return useInfiniteQuery(service, options);
}

function useInfiniteQuery<T extends ListPage, C>(
  service: (params: PageParams & CursorParams<C>) => Promise<T>,
  options: PageOptions<T> | CursorOptions<T, C>
) {
  const {
    queryKey,
    pageSize,
    getKey,
    manual,
    ready,
    refreshDeps,
    target,
    threshold = 100,
  } = options;
  const key = encodeQueryKey([...queryKey, pageSize]);
  const busy = useRef<string | undefined>(undefined);
  const request = useApi(
    async (previous?: InfiniteValue<T, C>): Promise<InfiniteValue<T, C>> => {
      const page = previous?.nextPage ?? 1;
      const cursor = previous
        ? previous.nextCursor
        : options.pagination === 'cursor'
          ? options.initialCursor
          : (1 as C);
      const payload = await service({ page, cursor: cursor as C, size: pageSize });
      const list = mergeQueryItems(previous?.payload.list ?? [], payload.list, getKey);
      let nextCursor: C | null;
      if (options.pagination === 'cursor') {
        nextCursor = options.getNextCursor(payload, cursor as C);
      } else {
        const { total, totalPage } = payload as T & { total: number; totalPage?: number };
        const lastPage = totalPage ?? Math.ceil(total / pageSize);
        nextCursor = page >= lastPage || payload.list.length === 0 ? null : ((page + 1) as C);
      }
      return {
        payload: { ...payload, list },
        pagePayload: payload,
        nextCursor,
        nextPage: page + 1,
      };
    },
    {
      queryKey: [...queryKey, pageSize],
      isEmpty: (value) => value.payload.list.length === 0,
      manual,
      ready,
      refreshDeps,
      onBefore: () => {
        busy.current = key;
      },
      onSuccess: (value) => options.onSuccess?.(value.pagePayload),
      onFinally: () => {
        if (busy.current === key) busy.current = undefined;
      },
      onError: options.onError ? (error) => options.onError?.(error, []) : undefined,
      onErrorEffect: (error) => options.onErrorEffect?.(error, []),
      showErrorToast: options.showErrorToast,
    }
  );
  const data = request.data?.payload;
  const loadingMore = request.loading && request.params[0] !== undefined;
  const noMore = request.data?.nextCursor === null;
  const loadMoreAsync = useMemoizedFn(async () => {
    if (!request.data || noMore || busy.current === key || ready === false) return;
    return (await request.runAsync(request.data)).payload;
  });
  const loadMore = useMemoizedFn(() => {
    void loadMoreAsync().catch(() => undefined);
  });
  const reloadAsync = useMemoizedFn(async () => (await request.runAsync()).payload);
  const reload = useMemoizedFn(() => {
    void reloadAsync().catch(() => undefined);
  });
  const retry = useMemoizedFn(() => {
    if (request.params[0] !== undefined) loadMore();
    else reload();
  });
  const mutate = useMemoizedFn(
    (value: T | undefined | ((previous: T | undefined) => T | undefined)) => {
      const next = typeof value === 'function' ? value(data) : value;
      request.mutate((previous) => (next && previous ? { ...previous, payload: next } : undefined));
    }
  );

  const cancel = useMemoizedFn(() => {
    busy.current = undefined;
    request.cancel();
  });
  const checkScroll = useMemoizedFn(() => {
    const element = target?.current;
    if (request.state.status === 'error' || !element) return;
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + threshold) loadMore();
  });
  useEventListener('scroll', checkScroll, { target });
  // 内容未填满视口时继续追加；错误之后必须由用户重试，避免自动请求循环。
  useEffect(() => {
    if (!target?.current || request.state.status !== 'success') return;
    const frame = requestAnimationFrame(checkScroll);
    return () => cancelAnimationFrame(frame);
  }, [data, request.state.status, target, checkScroll]);

  const state = getQueryState({
    data: data as T,
    hasData: data !== undefined,
    loading: request.loading && !loadingMore,
    loadingMore,
    error: request.error,
    isEmpty: (value) => value.list.length === 0,
  });
  return {
    data,
    state,
    error: request.error,
    loading: request.loading && !loadingMore,
    loadingMore,
    noMore,
    hasMore: data !== undefined && !noMore,
    loadMore,
    loadMoreAsync,
    reload,
    reloadAsync,
    retry,
    mutate,
    cancel,
  };
}
