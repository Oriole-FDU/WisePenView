import type { AxiosError } from 'axios';

import { parseApiErrorBody } from '@/apis/apiError';
import { recordHttpFailure } from '@/observability/http';

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

/** 仅在 Axios 最终失败后记录服务端错误，重试中间状态由同一请求链路承担。 */
export const reportHttpFailure = (error: AxiosError): boolean => {
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
