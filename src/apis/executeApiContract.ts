import type { AxiosRequestConfig } from 'axios';

import { type ApiContract, parseApiRequest, parseApiResponse } from '@/apis/contract';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/apis/request';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

const assertSupportedPlacement = (contract: ApiContract<unknown, unknown>): void => {
  const methodHasNoBody = contract.method === 'GET' || contract.method === 'DELETE';
  if (methodHasNoBody && contract.requestPlacement === 'body') {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `${contract.name} 的 ${contract.method} 请求不允许 body`,
    });
  }
};

const withQuery = (
  contract: ApiContract<unknown, unknown>,
  request: unknown,
  config?: AxiosRequestConfig
): AxiosRequestConfig | undefined =>
  contract.requestPlacement === 'query' ? { ...config, params: request } : config;

/**
 * 按 Contract 元数据完成请求校验、调用、envelope 解包和响应校验。
 * API 层只保留业务参数与 Contract，不重复手写 parse 顺序和 HTTP 方法。
 */
export async function executeApiContract<Request, Response>(
  contract: ApiContract<Request, Response>,
  value: unknown,
  config?: AxiosRequestConfig
): Promise<Response> {
  assertSupportedPlacement(contract);
  const request = parseApiRequest(contract, value);
  const requestConfig = withQuery(contract, request, config);

  let data: unknown;
  switch (contract.method) {
    case 'GET':
      data = await apiGet(contract.endpoint, requestConfig);
      break;
    case 'POST':
      data = await apiPost(
        contract.endpoint,
        contract.requestPlacement === 'body' ? request : undefined,
        requestConfig
      );
      break;
    case 'PUT':
      data = await apiPut(
        contract.endpoint,
        contract.requestPlacement === 'body' ? request : undefined,
        requestConfig
      );
      break;
    case 'PATCH':
      data = await apiPatch(
        contract.endpoint,
        contract.requestPlacement === 'body' ? request : undefined,
        requestConfig
      );
      break;
    case 'DELETE':
      data = await apiDelete(contract.endpoint, requestConfig);
      break;
  }

  return parseApiResponse(contract, data);
}
