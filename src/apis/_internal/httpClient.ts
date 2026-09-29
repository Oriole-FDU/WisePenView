// axios request 封装
import axios, { type AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

import { awaitAddrReady, getApiBaseUrl, notifyAddrFailure } from '@/apis/_internal/apiServerAddr';
import { mapAxiosErrorToWisePenError } from '@/apis/_internal/axiosErrorMapper';
import { applyXDeveloperHeader } from '@/apis/_internal/developmentTraffic';
import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';

declare module 'axios' {
  interface AxiosRequestConfig {
    retry?: number | false;
    retryDelayMs?: number;
    skipUnauthorizedHandling?: boolean;
    /** 请求发出时的会话版本；旧会话返回的 401 不得影响新会话。 */
    __wisePenAuthSessionVersion?: number;
  }
}

const httpClient = axios.create({
  timeout: 5000,
  withCredentials: true,
});

const DEFAULT_RETRY_COUNT = 2;
const DEFAULT_RETRY_DELAY_MS = 300;
// 只对可安全重复的读取方法默认重试；写入请求需由调用方确认幂等后显式设置 retry。
const DEFAULT_RETRYABLE_METHODS = new Set(['get', 'head', 'options']);

type RetryableAxiosConfig = InternalAxiosRequestConfig & {
  __wisePenRetryCount?: number;
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const getRetryLimit = (config: RetryableAxiosConfig): number => {
  if (config.retry === false) return 0;
  if (typeof config.retry === 'number') return Math.max(0, config.retry);
  return DEFAULT_RETRYABLE_METHODS.has((config.method ?? 'get').toLowerCase())
    ? DEFAULT_RETRY_COUNT
    : 0;
};

const isRetryableAxiosError = (error: AxiosError): boolean => {
  if (error.code === 'ERR_CANCELED') return false;

  const status = error.response?.status;
  if (typeof status === 'number') {
    return status >= 500 && status < 600;
  }

  return true;
};

const retryAxiosRequest = (error: AxiosError): Promise<unknown> | undefined => {
  const config = error.config as RetryableAxiosConfig | undefined;
  if (!config || !isRetryableAxiosError(error)) {
    return undefined;
  }

  const retryCount = config.__wisePenRetryCount ?? 0;
  const retryLimit = getRetryLimit(config);
  if (retryCount >= retryLimit) {
    return undefined;
  }

  config.__wisePenRetryCount = retryCount + 1;
  const delayBase = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  return delay(delayBase * 2 ** retryCount).then(() => httpClient.request(config));
};

httpClient.interceptors.request.use(async (config) => {
  config.__wisePenAuthSessionVersion ??= authSessionCoordinator.getSessionVersion();
  await awaitAddrReady();
  config.baseURL = getApiBaseUrl();
  config.headers = AxiosHeaders.from(config.headers);
  applyXDeveloperHeader(new Headers()).forEach((value, key) => {
    config.headers.set(key, value);
  });
  return config;
});

httpClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    if (!error.response) {
      notifyAddrFailure();
    }
    const retryRequest = retryAxiosRequest(error);
    if (retryRequest) {
      return retryRequest;
    }

    const requestConfig = error.config;
    const authSessionState =
      error.response?.status !== 401 || requestConfig?.skipUnauthorizedHandling
        ? 'unrelated'
        : requestConfig?.__wisePenAuthSessionVersion === authSessionCoordinator.getSessionVersion()
          ? 'handled'
          : 'stale';
    if (
      error.response?.status === 401 &&
      requestConfig &&
      !requestConfig.skipUnauthorizedHandling &&
      requestConfig.__wisePenAuthSessionVersion === authSessionCoordinator.getSessionVersion()
    ) {
      authSessionCoordinator.publish('unauthorized');
    }
    return Promise.reject(mapAxiosErrorToWisePenError(error, authSessionState));
  }
);

export default httpClient;
