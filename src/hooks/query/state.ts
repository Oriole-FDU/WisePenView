/** query key 只包含可稳定序列化的原始值；所有影响服务端结果的条件都必须进入 key。 */
export type ApiQueryKey = readonly (string | number | boolean | null | undefined)[];

export type ApiQueryState<T> =
  | { status: 'idle'; data: undefined; error?: never }
  | { status: 'loading'; data: T | undefined; error?: never }
  | { status: 'refreshing' | 'loadingMore'; data: T; error?: never }
  | { status: 'empty' | 'success'; data: T; error?: never }
  | { status: 'error'; data: T | undefined; error: Error };

export const encodeQueryKey = (key: ApiQueryKey): string =>
  JSON.stringify(key.map((value) => [typeof value, value]));

export function getQueryState<T>({
  data,
  hasData,
  loading,
  loadingMore = false,
  error,
  isEmpty,
}: {
  data: T;
  hasData: boolean;
  loading: boolean;
  loadingMore?: boolean;
  error?: Error;
  isEmpty: (value: T) => boolean;
}): ApiQueryState<T> {
  if (loadingMore && hasData) return { status: 'loadingMore', data };
  if (loading) return hasData ? { status: 'refreshing', data } : { status: 'loading', data };
  if (error) return { status: 'error', data, error };
  if (!hasData) return { status: 'idle', data: undefined };
  return { status: isEmpty(data) ? 'empty' : 'success', data };
}

/** 重复条目保持首次出现的位置，以后到达的内容更新条目。 */
export function mergeQueryItems<T>(
  previous: T[],
  incoming: T[],
  getKey: (item: T) => string | number
) {
  const items = new Map(previous.map((item) => [getKey(item), item]));
  incoming.forEach((item) => items.set(getKey(item), item));
  return [...items.values()];
}
