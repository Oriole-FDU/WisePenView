/**
 * Axios 最终失败的遥测适配。
 *
 * 只供 API 请求基础设施使用：解析 HTTP 协议字段后交给统一事件管线，
 * 不修改原异常，也不负责用户提示和重试策略。
 */
import type { AxiosError } from 'axios';

import { parseApiErrorBody } from '@/apis/apiError';

import { markExceptionObserved } from './capture';
import { isObservabilityActive, recordHttpFailure } from './pipeline';

const readRequestTarget = (error: AxiosError): { path: string; host?: string; port?: number } => {
  try {
    const url = new URL(error.config?.url ?? '/', error.config?.baseURL ?? window.location.origin);
    return {
      path: url.pathname,
      host: url.hostname,
      port: url.port ? Number(url.port) : undefined,
    };
  } catch {
    return { path: '/invalid-url' };
  }
};

/** 仅在 Axios 最终失败后记录 5xx，重试中间状态不重复计数。 */
export const reportHttpFailure = (error: AxiosError): boolean => {
  if (!isObservabilityActive()) return false;
  const status = error.response?.status;
  if (!status || status < 500) return false;

  const body = parseApiErrorBody(error.response?.data);
  const target = readRequestTarget(error);
  const requestId = error.response?.headers['x-request-id'];
  const resendCount =
    (error.config as { __wisePenRetryCount?: number } | undefined)?.__wisePenRetryCount ?? 0;

  return recordHttpFailure({
    status,
    method: error.config?.method ?? 'get',
    path: target.path,
    host: target.host,
    port: target.port,
    requestId: typeof requestId === 'string' ? requestId : undefined,
    businessCode: body?.code,
    resendCount,
    serverMessage: body?.message,
  });
};

export const markHttpExceptionObserved = markExceptionObserved;
