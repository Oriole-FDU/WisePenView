import type { AxiosRequestConfig } from 'axios';

import httpClient from '@/apis/_internal/httpClient';
import type { ApiResponse } from '@/apis/api.type';
import { isApiResponseEnvelope } from '@/apis/runtimeContract';
import { type RequestObservation, startRequestObservation } from '@/observability/request';
import { FRONTEND_NETWORK_ERROR, WisePenError } from '@/utils/error';

/**
 * 业务码非 200 时抛出统一错误。
 * 传输层只归一化 code 与后端文案，用户可见提示统一由 parseErrorMessage 按 code 解析。
 */
function checkResponse(res: ApiResponse<unknown>): void {
  if (res.code !== 200) {
    throw new WisePenError({
      code: res.code,
      source: 'api',
      serverMsg: res.msg ?? undefined,
    });
  }
}

function unwrap(res: unknown): unknown {
  if (!isApiResponseEnvelope(res)) {
    throw new WisePenError({
      code: FRONTEND_NETWORK_ERROR.INVALID_RESPONSE,
      source: 'http',
      message: 'API 响应契约无效',
    });
  }
  checkResponse(res);
  // envelope 已通过运行期校验，payload 具体形状由后续 Contract 解析器校验。
  return res.data;
}

/**
 * 文本接口可能仍以 HTTP 200 + R envelope 返回业务错误。
 * 仅当正文确为 envelope 时走统一错误处理，其余内容原样作为领域文本。
 */
export function parseTextApiResponse(value: unknown): string {
  if (typeof value !== 'string') {
    throw new WisePenError({
      code: FRONTEND_NETWORK_ERROR.INVALID_RESPONSE,
      source: 'http',
      message: 'API 文本响应契约无效',
    });
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) return value;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isApiResponseEnvelope(parsed)) return value;
    checkResponse(parsed);
    return typeof parsed.data === 'string' ? parsed.data : value;
  } catch (error) {
    if (error instanceof WisePenError) throw error;
    return value;
  }
}

/** 每个顶层请求只创建一个逻辑现场，解包与契约校验共享最终结果边界。 */
async function executeRequest<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  config: AxiosRequestConfig | undefined,
  data: unknown,
  parse: (value: unknown) => T
): Promise<T> {
  let observation: RequestObservation | undefined;
  try {
    observation = startRequestObservation(url, method, config);
  } catch {
    // 观测初始化失败时继续发送原请求。
  }
  const requestConfig = observation
    ? { ...config, __wisePenRequestObservation: observation }
    : config;

  try {
    const response =
      method === 'get' || method === 'delete'
        ? await httpClient[method](url, requestConfig)
        : await httpClient[method](url, data, requestConfig);
    const result = parse(response);
    observation?.recordSuccess();
    return result;
  } catch (error) {
    observation?.reportFailure(error);
    throw error;
  } finally {
    observation?.finish();
  }
}

/** GET 解包后在同一请求观测内完成契约解析。 */
export function apiGet<T>(
  url: string,
  config: AxiosRequestConfig | undefined,
  parsePayload: (value: unknown) => T
): Promise<T> {
  return executeRequest('get', url, config, undefined, (value) => parsePayload(unwrap(value)));
}

/** POST 解包后在同一请求观测内完成契约解析。 */
export function apiPost<T>(
  url: string,
  data: unknown,
  config: AxiosRequestConfig | undefined,
  parsePayload: (value: unknown) => T
): Promise<T> {
  return executeRequest('post', url, config, data, (value) => parsePayload(unwrap(value)));
}

/** 读取文本并在同一请求观测内完成契约解析。 */
export function apiGetText<T>(
  url: string,
  config: AxiosRequestConfig | undefined,
  parsePayload: (value: unknown) => T
): Promise<T> {
  return executeRequest(
    'get',
    url,
    {
      responseType: 'text',
      transformResponse: [(data: unknown) => data],
      ...config,
    },
    undefined,
    (value) => parsePayload(parseTextApiResponse(value))
  );
}

/** PUT 解包后在同一请求观测内完成契约解析。 */
export function apiPut<T>(
  url: string,
  data: unknown,
  config: AxiosRequestConfig | undefined,
  parsePayload: (value: unknown) => T
): Promise<T> {
  return executeRequest('put', url, config, data, (value) => parsePayload(unwrap(value)));
}

/** PATCH 解包后在同一请求观测内完成契约解析。 */
export function apiPatch<T>(
  url: string,
  data: unknown,
  config: AxiosRequestConfig | undefined,
  parsePayload: (value: unknown) => T
): Promise<T> {
  return executeRequest('patch', url, config, data, (value) => parsePayload(unwrap(value)));
}

/** DELETE 解包后在同一请求观测内完成契约解析。 */
export function apiDelete<T>(
  url: string,
  config: AxiosRequestConfig | undefined,
  parsePayload: (value: unknown) => T
): Promise<T> {
  return executeRequest('delete', url, config, undefined, (value) => parsePayload(unwrap(value)));
}
