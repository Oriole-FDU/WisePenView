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

/** 每个顶层请求只创建一个逻辑现场，响应解包失败仍保留发起时的身份与页面。 */
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

/** GET 并解包 envelope；payload 在契约解析前保持 unknown。 */
export function apiGet(url: string, config?: AxiosRequestConfig): Promise<unknown> {
  return executeRequest('get', url, config, undefined, unwrap<unknown>);
}

/**
 * 未迁移契约的 GET 兼容入口。
 * 该泛型不会执行运行期校验，新接口应使用 executeApiContract。
 *
 * @deprecated 仅供存量 API 迁移使用；对应领域完成 Contract 化后删除。
 */
export function apiGetUnchecked<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return executeRequest('get', url, config, undefined, unwrap<T>);
}

/** POST 并解包 envelope；payload 在契约解析前保持 unknown。 */
export function apiPost(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<unknown> {
  return executeRequest('post', url, config, data, unwrap<unknown>);
}

/**
 * 未迁移契约的 POST 兼容入口。
 * 该泛型不会执行运行期校验，新接口应使用 executeApiContract。
 *
 * @deprecated 仅供存量 API 迁移使用；对应领域完成 Contract 化后删除。
 */
export function apiPostUnchecked<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
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

/** PUT 并解包 envelope；payload 在契约解析前保持 unknown。 */
export function apiPut(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<unknown> {
  return executeRequest('put', url, config, data, unwrap<unknown>);
}

/**
 * 未迁移契约的 PUT 兼容入口。
 * 该泛型不会执行运行期校验，新接口应使用 executeApiContract。
 *
 * @deprecated 仅供存量 API 迁移使用；对应领域完成 Contract 化后删除。
 */
export function apiPutUnchecked<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  return executeRequest('put', url, config, data, unwrap<T>);
}

/** PATCH 并解包 envelope；payload 在契约解析前保持 unknown。 */
export function apiPatch(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<unknown> {
  return executeRequest('patch', url, config, data, unwrap<unknown>);
}

/** DELETE 并解包 envelope；payload 在契约解析前保持 unknown。 */
export function apiDelete(url: string, config?: AxiosRequestConfig): Promise<unknown> {
  return executeRequest('delete', url, config, undefined, unwrap<unknown>);
}

/**
 * 未迁移契约的 DELETE 兼容入口。
 * 该泛型不会执行运行期校验，新接口应使用 executeApiContract。
 *
 * @deprecated 仅供存量 API 迁移使用；对应领域完成 Contract 化后删除。
 */
export function apiDeleteUnchecked<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return executeRequest('delete', url, config, undefined, unwrap<T>);
}
