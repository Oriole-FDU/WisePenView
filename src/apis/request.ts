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

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return unwrap<T>(await httpClient.get(url, config));
}

export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  return unwrap<T>(await httpClient.post(url, data, config));
}

export async function apiPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  return unwrap<T>(await httpClient.put(url, data, config));
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return unwrap<T>(await httpClient.delete(url, config));
}
