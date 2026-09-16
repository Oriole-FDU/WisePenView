import type { AxiosRequestConfig } from 'axios';

import type { ApiResponse } from '@/apis/api.type';
import Axios from '@/apis/Axios';
import { WisePenError } from '@/utils/error';

function checkResponse(res: ApiResponse<unknown>): void {
  if (res.code !== 200) {
    throw new WisePenError({
      code: res.code,
      source: 'api',
      serverMsg: res.msg,
      message: res.msg,
    });
  }
}

function unwrap<T>(res: ApiResponse<T>): T {
  checkResponse(res);
  return res.data as T;
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return unwrap((await Axios.get(url, config)) as ApiResponse<T>);
}

export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  return unwrap((await Axios.post(url, data, config)) as ApiResponse<T>);
}

export async function apiPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  return unwrap((await Axios.put(url, data, config)) as ApiResponse<T>);
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return unwrap((await Axios.delete(url, config)) as ApiResponse<T>);
}
