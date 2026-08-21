// axios request 封装
import { awaitAddrReady, getApiBaseUrl, notifyAddrFailure } from '@/apis/apiServerAddr';
import { mapAxiosErrorToWisePenError } from '@/apis/axiosErrorMapper';
import { applyXDeveloperHeader } from '@/apis/developmentTraffic';
import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';
import { toast } from '@heroui/react';
import axios, { AxiosHeaders, type AxiosError } from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipUnauthorizedHandling?: boolean;
  }
}

const Axios = axios.create({
  timeout: 5000,
  withCredentials: true,
});

const UNAUTHORIZED_TOAST_DEBOUNCE_MS = 3000;

let lastUnauthorizedToastAt = 0;

const notifyUnauthorized = (): void => {
  const now = Date.now();
  if (now - lastUnauthorizedToastAt < UNAUTHORIZED_TOAST_DEBOUNCE_MS) return;

  lastUnauthorizedToastAt = now;
  toast.danger('无权访问');
};

Axios.interceptors.request.use(async (config) => {
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
    if (error.response?.status === 401 && !error.config?.skipUnauthorizedHandling) {
      notifyUnauthorized();
      authSessionCoordinator.unauthorized();
    }
    return Promise.reject(mapAxiosErrorToWisePenError(error));
  }
);

export default Axios;
