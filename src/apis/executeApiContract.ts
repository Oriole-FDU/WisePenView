import type { AxiosRequestConfig } from 'axios';

import { type ApiContract, parseApiRequest, parseApiResponse } from '@/apis/contract';
import { apiDelete, apiGet, apiGetText, apiPatch, apiPost, apiPut } from '@/apis/request';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

const assertSupportedPlacement = (contract: ApiContract<unknown, unknown>): void => {
  const methodHasNoBody = contract.method === 'GET' || contract.method === 'DELETE';
  if (methodHasNoBody && contract.requestPlacement === 'body') {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `${contract.name} 的 ${contract.method} 请求不允许 body`,
    });
  }
};

const getRequestParts = (
  contract: ApiContract<unknown, unknown>,
  request: unknown,
  config?: AxiosRequestConfig
): {
  body: unknown;
  config: AxiosRequestConfig | undefined;
} => {
  if (contract.requestPlacement === 'query') {
    return { body: undefined, config: { ...config, params: request } };
  }

  if (contract.requestPlacement === 'body' && contract.queryKeys?.length) {
    const body = { ...(request as Record<string, unknown>) };
    const query: Record<string, unknown> = {};
    for (const key of contract.queryKeys) {
      query[key] = body[key];
      delete body[key];
    }
    return { body, config: { ...config, params: query } };
  }

  return {
    body: contract.requestPlacement === 'body' ? request : undefined,
    config,
  };
};

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
  const requestParts = getRequestParts(contract, request, config);
  const requestConfig = requestParts.config;

  let data: unknown;
  if (contract.transport === 'text') {
    if (contract.method !== 'GET') {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `${contract.name} 的文本 transport 仅支持 GET`,
      });
    }
    data = await apiGetText(contract.endpoint, requestConfig);
    return parseApiResponse(contract, data);
  }

  switch (contract.method) {
    case 'GET':
      data = await apiGet(contract.endpoint, requestConfig);
      break;
    case 'POST':
      data = await apiPost(
        contract.endpoint,
        contract.method === 'POST' ? requestParts.body : undefined,
        requestConfig
      );
      break;
    case 'PUT':
      data = await apiPut(
        contract.endpoint,
        contract.method === 'PUT' ? requestParts.body : undefined,
        requestConfig
      );
      break;
    case 'PATCH':
      data = await apiPatch(
        contract.endpoint,
        contract.method === 'PATCH' ? requestParts.body : undefined,
        requestConfig
      );
      break;
    case 'DELETE':
      data = await apiDelete(contract.endpoint, requestConfig);
      break;
  }

  return parseApiResponse(contract, data);
}
