import axios, { type AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

// axios request 封装
import type { ApiErrorBody } from '@/apis/api.type';
import { awaitAddrReady, getApiBaseUrl, notifyAddrFailure } from '@/apis/apiServerAddr';
import { applyXDeveloperHeader } from '@/apis/developmentTraffic';
import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';
import { WisePenError } from '@/utils/error';
import { FRONTEND_NETWORK_ERROR } from '@/utils/error/codes';
import { isRecord } from '@/utils/typeGuards';

declare module 'axios' {
  interface AxiosRequestConfig {
    retry?: number | false;
    retryDelayMs?: number;
    skipUnauthorizedHandling?: boolean;
    /** 请求发出时的会话版本；旧会话返回的 401 不得影响新会话。 */
    __wisePenAuthSessionVersion?: number;
  }
}

const Axios = axios.create({
  timeout: 5000,
  withCredentials: true,
});

const DEFAULT_RETRY_COUNT = 2;
const DEFAULT_RETRY_DELAY_MS = 300;
type RetryableAxiosConfig = InternalAxiosRequestConfig & {
  __wisePenRetryCount?: number;
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const readApiErrorBody = (data: unknown): ApiErrorBody | undefined => {
  if (!isRecord(data)) return undefined;
  const code = typeof data.code === 'number' ? data.code : undefined;
  const msg =
    typeof data.msg === 'string'
      ? data.msg
      : typeof data.message === 'string'
        ? data.message
        : undefined;
  if (code === undefined && msg === undefined) return undefined;
  return { code, msg };
};

const mapNetworkCode = (error: AxiosError): number => {
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return FRONTEND_NETWORK_ERROR.TIMEOUT;
  }
  if (error.code === 'ERR_CANCELED') {
    return FRONTEND_NETWORK_ERROR.CANCELED;
  }
  if (error.code === 'ERR_NETWORK' || !error.response) {
    return FRONTEND_NETWORK_ERROR.NETWORK;
  }
  return FRONTEND_NETWORK_ERROR.UNKNOWN;
};

const mapHttpCode = (status: number): number => {
  if (status === 400) {
    return FRONTEND_NETWORK_ERROR.BAD_REQUEST;
  }
  if (status === 500) {
    return FRONTEND_NETWORK_ERROR.SERVER;
  }
  return FRONTEND_NETWORK_ERROR.HTTP;
};

const getRetryLimit = (config: RetryableAxiosConfig): number => {
  if (config.retry === false) return 0;
  if (typeof config.retry === 'number') return Math.max(0, config.retry);
  return DEFAULT_RETRY_COUNT;
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
  return delay(delayBase * 2 ** retryCount).then(() => Axios.request(config));
};

const mapAxiosErrorToWisePenError = (
  error: AxiosError,
  authSessionState: 'handled' | 'stale' | 'unrelated'
): WisePenError => {
  if (!error.response) {
    const code = mapNetworkCode(error);
    return new WisePenError({
      code,
      source: 'network',
      message: error.message,
      cause: error,
    });
  }

  const { status, data } = error.response;
  const body = readApiErrorBody(data);
  const serverMsg = body?.msg;
  const businessCode = body?.code;

  if (typeof businessCode === 'number') {
    return new WisePenError({
      code: businessCode,
      source: status === 400 || status === 500 ? 'api' : 'http',
      serverMsg,
      message: serverMsg ?? error.message,
      meta: {
        httpStatus: status,
        authSessionState,
      },
      cause: error,
    });
  }

  const fallbackMsg =
    serverMsg ?? (status === 400 ? '请求参数错误' : status === 500 ? '服务器错误' : error.message);

  return new WisePenError({
    code: mapHttpCode(status),
    source: 'http',
    serverMsg: fallbackMsg,
    message: fallbackMsg,
    meta: {
      httpStatus: status,
      authSessionState,
    },
    cause: error,
  });
};

Axios.interceptors.request.use(async (config) => {
  config.__wisePenAuthSessionVersion ??= authSessionCoordinator.getSessionVersion();
  await awaitAddrReady();
  config.baseURL = getApiBaseUrl();
  config.headers = AxiosHeaders.from(config.headers);
  applyXDeveloperHeader(new Headers()).forEach((value, key) => {
    config.headers.set(key, value);
  });
  return config;
});

Axios.interceptors.response.use(
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

export default Axios;
