// axios request 封装
import type { ApiErrorBody } from '@/apis/api.type';
import {
  awaitAddrReady,
  getApiBaseURL,
  initApiServerAddrRuntime,
  notifyAddrFailure,
} from '@/apis/apiServerAddr';
import { getDeveloperHeaders } from '@/apis/gray';
import { clearAllServiceCaches } from '@/domains/_shared/cacheRegistry';
import { clearAllZustandStores } from '@/store';
import { emitAuthChangeEvent } from '@/utils/auth/authChange';
import { WisePenError } from '@/utils/error';
import { FRONTEND_NETWORK_ERROR } from '@/utils/error/codes';
import axios, { AxiosHeaders, type AxiosError } from 'axios';

// 初始化 API 服务器地址运行时
initApiServerAddrRuntime();

const Axios = axios.create({
  timeout: 5000,
  withCredentials: true,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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

const mapAxiosErrorToWisePenError = (error: AxiosError): WisePenError => {
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
    cause: error,
  });
};

// baseURL 逐次读最新值；addr 可疑不可达时短暂等探测收敛，避免排队请求继续撞旧地址。
Axios.interceptors.request.use(async (config) => {
  await awaitAddrReady();
  config.baseURL = getApiBaseURL();
  config.headers = AxiosHeaders.from(config.headers);
  Object.entries(getDeveloperHeaders()).forEach(([key, value]) => {
    config.headers.set(key, value);
  });
  return config;
});

Axios.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    // 无 response：传输层失败，反馈给 ping 模块立即重探测，绕过默认轮询节奏
    if (!error.response) {
      notifyAddrFailure();
    }
    if (error.response?.status === 401) {
      clearAllServiceCaches();
      clearAllZustandStores();
      emitAuthChangeEvent();
      window.location.href = '/login';
    }
    return Promise.reject(mapAxiosErrorToWisePenError(error));
  }
);

export default Axios;
