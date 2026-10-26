import type { AxiosRequestConfig } from 'axios';

import httpClient from '@/apis/_internal/httpClient';
import type { ApiResponse } from '@/apis/api.type';
import { isApiResponseEnvelope } from '@/apis/runtimeContract';
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

/** GET 并解包 envelope；payload 在契约解析前保持 unknown。 */
export async function apiGet(url: string, config?: AxiosRequestConfig): Promise<unknown> {
  return unwrap<unknown>(await httpClient.get(url, config));
}

/**
 * 未迁移契约的 GET 兼容入口。
 * 该泛型不会执行运行期校验，新接口应使用 apiGet + ApiContract。
 */
export async function apiGetUnchecked<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return unwrap<T>(await httpClient.get(url, config));
}

/** POST 并解包 envelope；payload 在契约解析前保持 unknown。 */
export async function apiPost(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<unknown> {
  return unwrap<unknown>(await httpClient.post(url, data, config));
}

/**
 * 未迁移契约的 POST 兼容入口。
 * 该泛型不会执行运行期校验，新接口应使用 apiPost + ApiContract。
 */
export async function apiPostUnchecked<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  return unwrap<T>(await httpClient.post(url, data, config));
}

/** 读取裸文本响应；仅用于后端明确声明非 R<T> 的接口。 */
export async function apiGetText(url: string, config?: AxiosRequestConfig): Promise<string> {
  const response = await httpClient.get<unknown>(url, {
    responseType: 'text',
    transformResponse: [(data: unknown) => data],
    ...config,
  });
  return parseTextApiResponse(response);
}

/** PUT 并解包 envelope；payload 在契约解析前保持 unknown。 */
export async function apiPut(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<unknown> {
  return unwrap<unknown>(await httpClient.put(url, data, config));
}

/**
 * 未迁移契约的 PUT 兼容入口。
 * 该泛型不会执行运行期校验，新接口应使用 apiPut + ApiContract。
 */
export async function apiPutUnchecked<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  return unwrap<T>(await httpClient.put(url, data, config));
}

/** DELETE 并解包 envelope；payload 在契约解析前保持 unknown。 */
export async function apiDelete(url: string, config?: AxiosRequestConfig): Promise<unknown> {
  return unwrap<unknown>(await httpClient.delete(url, config));
}

/**
 * 未迁移契约的 DELETE 兼容入口。
 * 该泛型不会执行运行期校验，新接口应使用 apiDelete + ApiContract。
 */
export async function apiDeleteUnchecked<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return unwrap<T>(await httpClient.delete(url, config));
}
