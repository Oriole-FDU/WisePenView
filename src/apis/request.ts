import type { AxiosRequestConfig } from 'axios';

import httpClient from '@/apis/_internal/httpClient';
import type { ApiResponse } from '@/apis/api.type';
import { isApiResponseEnvelope } from '@/apis/runtimeContract';
import { recordRequestSuccess, reportApiFailure, RequestTelemetry } from '@/telemetry/http';
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

function unwrap<T>(res: unknown): T {
  if (!isApiResponseEnvelope(res)) {
    throw new WisePenError({
      code: FRONTEND_NETWORK_ERROR.INVALID_RESPONSE,
      source: 'http',
      message: 'API 响应契约无效',
    });
  }
  checkResponse(res);
  // envelope 已通过运行期校验，DTO 具体形状由调用侧的 API 类型约束。
  return res.data as T;
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

/** 每个顶层请求只创建一次现场；响应解包失败仍能关联到发起时的账号与页面。 */
async function executeRequest<T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  config: AxiosRequestConfig | undefined,
  data: unknown,
  parse: (response: unknown) => T
): Promise<T> {
  const request = new RequestTelemetry(url, method, config);
  const requestConfig = { ...config, __wisePenTelemetry: request };
  try {
    const response =
      method === 'get' || method === 'delete'
        ? await httpClient[method](url, requestConfig)
        : await httpClient[method](url, data, requestConfig);
    const result = parse(response);
    recordRequestSuccess(request);
    return result;
  } catch (error) {
    reportApiFailure(error, request);
    throw error;
  } finally {
    request.finish();
  }
}

export function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return executeRequest('get', url, config, undefined, unwrap<T>);
}

export function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return executeRequest('post', url, config, data, unwrap<T>);
}

/** 读取裸文本响应；仅用于后端明确声明非 R<T> 的接口。 */
export function apiGetText(url: string, config?: AxiosRequestConfig): Promise<string> {
  return executeRequest(
    'get',
    url,
    {
      responseType: 'text',
      transformResponse: [(data: unknown) => data],
      ...config,
    },
    undefined,
    parseTextApiResponse
  );
}

export function apiPut<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return executeRequest('put', url, config, data, unwrap<T>);
}

export function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return executeRequest('delete', url, config, undefined, unwrap<T>);
}
