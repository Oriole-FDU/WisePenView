import type { AxiosError } from 'axios';

import { parseApiErrorBody } from '@/apis/apiError';
import { reportError } from '@/utils/error';

/** 只在重试结束后上报；之后的 WisePenError cause 复用同一编号与去重判定。 */
export const reportHttpFailure = (error: AxiosError): void => {
  try {
    const status = error.response?.status;
    if (!status || status < 500) return;
    const url = new URL(error.config?.url ?? '/', error.config?.baseURL ?? window.location.origin);
    const method = error.config?.method?.toUpperCase() ?? 'GET';
    const requestId = error.response?.headers['x-request-id'];
    reportError(error, {
      origin: 'http',
      pathname: window.location.pathname,
      http: {
        method: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
          ? method
          : 'OTHER',
        status,
        retryCount:
          (error.config as { __wisePenRetryCount?: number } | undefined)?.__wisePenRetryCount ?? 0,
        pathname: url.pathname,
        businessCode: parseApiErrorBody(error.response?.data)?.code,
        requestId: typeof requestId === 'string' ? requestId : undefined,
      },
    });
  } catch {
    // 观测失败不得影响原始 HTTP 错误。
  }
};
