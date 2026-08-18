import Axios from '@/apis/Axios';
import type { ApiResponse } from '@/apis/api.type';
import i18n from '@/i18n';
import { I18N_NAMESPACES } from '@/i18n/resources';
import { WisePenError } from '@/utils/error';
import type { AxiosRequestConfig } from 'axios';

function checkResponse(res: ApiResponse<unknown>): void {
  if (res.code !== 200) {
    const message = res.msg ?? i18n.t('code.1001', { ns: I18N_NAMESPACES.ERRORS });
    throw new WisePenError({
      code: res.code,
      source: 'api',
      serverMsg: res.msg ?? undefined,
      message,
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
