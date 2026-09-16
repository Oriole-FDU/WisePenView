import type { OptionalPageApiRequest, PageR } from '@/apis/api.type';

/** 模拟网络延迟，并隔离响应与内存数据，防止调用方直接修改 mock 后端。 */
export async function mockResponse<T>(data: T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return structuredClone(data);
}

export function mockPage<T>(rows: T[], { page = 1, size = 20 }: OptionalPageApiRequest): PageR<T> {
  return {
    list: rows.slice((page - 1) * size, page * size),
    total: rows.length,
    page,
    size,
    totalPage: Math.ceil(rows.length / size),
  };
}
