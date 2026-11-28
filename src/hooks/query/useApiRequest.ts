import { useLatest, useMemoizedFn } from 'ahooks';
import useRequest from 'ahooks/es/useRequest';
import type { Options, Service } from 'ahooks/es/useRequest/src/types';
import { useEffect } from 'react';

import { createError, isWisePenError, reportError } from '@/utils/error';

import { type ApiQueryKey, encodeQueryKey, getQueryState } from './state';

export interface ApiErrorOptions<TParams extends unknown[]> {
  onError?: (error: Error, params: TParams) => void;
  onErrorEffect?: (error: Error, params: TParams) => void;
  showErrorToast?: boolean;
}

type RequestOptions<T, P extends unknown[]> = Omit<
  Options<T, P>,
  'cacheKey' | 'getCache' | 'setCache' | 'refreshDepsAction'
> &
  ApiErrorOptions<P>;

type EmptySelector<T> = { isEmpty?: (data: T) => boolean };
type ApiOptions<T, P extends unknown[]> = RequestOptions<T, P> & {
  keepPreviousData?: boolean;
  queryKey?: ApiQueryKey;
} & EmptySelector<T>;

export function handleApiError<P extends unknown[]>(
  error: Error,
  params: P,
  options: ApiErrorOptions<P>
) {
  const normalized = createError(error);
  const unauthorized =
    isWisePenError(error) &&
    error.meta?.httpStatus === 401 &&
    (error.meta.authSessionState === 'handled' || error.meta.authSessionState === 'stale');
  reportError(
    normalized,
    options.onError || options.showErrorToast === false || unauthorized ? 'silence' : 'error'
  );
  if (options.onError) options.onError(normalized, params);
  else options.onErrorEffect?.(normalized, params);
}

interface QueryValue<T> {
  key: string;
  value: T;
}

/** 普通读取与手动命令共用 ahooks 的取消、轮询和重试能力，结果始终带查询归属。 */
export function useApi<T extends readonly unknown[], P extends unknown[]>(
  service: Service<T, P>,
  options: ApiOptions<T, P> & { queryKey: ApiQueryKey }
): ReturnType<typeof useApiRequest<T, P>>;
export function useApi<T, P extends unknown[]>(
  service: Service<T, P>,
  options?: ApiOptions<T, P> &
    ({ queryKey?: undefined } | { queryKey: ApiQueryKey; isEmpty: (data: T) => boolean })
): ReturnType<typeof useApiRequest<T, P>>;
export function useApi<T, P extends unknown[]>(
  service: Service<T, P>,
  options: ApiOptions<T, P> = {}
) {
  return useApiRequest(service, options);
}

function useApiRequest<T, P extends unknown[]>(service: Service<T, P>, options: ApiOptions<T, P>) {
  const {
    queryKey,
    isEmpty,
    keepPreviousData = false,
    manual = false,
    ready = true,
    defaultParams,
    refreshDeps = [],
    onBefore,
    onSuccess,
    onFinally,
    onError,
    onErrorEffect,
    showErrorToast,
    ...rest
  } = options;
  const key = encodeQueryKey(queryKey ?? []);
  const latest = useLatest({ key, defaultParams });
  const request = useRequest<QueryValue<T>, [string, ...P]>(
    async (requestKey, ...params) => ({ key: requestKey, value: await service(...params) }),
    {
      ...rest,
      manual: true,
      ready,
      onBefore: ([requestKey, ...params]) => {
        if (requestKey === latest.current.key) onBefore?.(params);
      },
      onSuccess: (result, [requestKey, ...params]) => {
        if (requestKey === latest.current.key) onSuccess?.(result.value, params);
      },
      onError: (error, [requestKey, ...params]) => {
        if (requestKey === latest.current.key) {
          handleApiError(error, params, { onError, onErrorEffect, showErrorToast });
        }
      },
      onFinally: ([requestKey, ...params], result, error) => {
        if (requestKey === latest.current.key) onFinally?.(params, result?.value, error);
      },
    }
  );
  const { cancel, run: requestRun, runAsync: requestRunAsync, mutate: requestMutate } = request;

  // 生命周期只在查询基础设施中维护；key 切换、禁用和卸载都令旧请求失效。
  useEffect(() => {
    cancel();
    if (!manual && ready) {
      requestRun(key, ...(latest.current.defaultParams ?? ([] as unknown as P)));
    }
    return cancel;
  }, [key, manual, ready, cancel, latest, requestRun, ...refreshDeps]);

  // ahooks 的公开命令具有稳定引用；消费端可能把它们注册进订阅或 effect。
  const run = useMemoizedFn((...params: P) => requestRun(key, ...params));
  const runAsync = useMemoizedFn(
    async (...params: P) => (await requestRunAsync(key, ...params)).value
  );
  const getRefreshParams = (): P =>
    (request.params[0] === key ? request.params.slice(1) : (defaultParams ?? [])) as P;
  const refresh = useMemoizedFn(() => run(...getRefreshParams()));
  const refreshAsync = useMemoizedFn(() => runAsync(...getRefreshParams()));
  const hasData = request.data !== undefined && (request.data.key === key || keepPreviousData);
  const data = hasData ? request.data?.value : undefined;
  const isCurrentRequest = request.params[0] === key;
  const loading = (isCurrentRequest && request.loading) || (!isCurrentRequest && !manual && ready);
  const error = isCurrentRequest && !loading ? request.error : undefined;
  const mutate = useMemoizedFn(
    (value: T | undefined | ((previous: T | undefined) => T | undefined)) => {
      const next =
        typeof value === 'function'
          ? (value as (previous: T | undefined) => T | undefined)(data)
          : value;
      requestMutate(next === undefined ? undefined : { key, value: next });
    }
  );
  const state = getQueryState({
    data: data as T,
    hasData: hasData && request.data?.key === key,
    loading,
    error,
    isEmpty: isEmpty ?? ((value) => Array.isArray(value) && value.length === 0),
  });

  return {
    state,
    data,
    error,
    loading,
    isPreviousData: hasData && request.data?.key !== key,
    params: request.params.slice(1) as P | [],
    run,
    runAsync,
    refresh,
    refreshAsync,
    mutate,
    cancel,
  };
}
