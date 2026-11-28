import type { AxiosError } from 'axios';

import { parseApiErrorBody } from '@/apis/apiError';
import { createError, FRONTEND_NETWORK_ERROR, type WisePenError } from '@/utils/error';

export type AuthSessionErrorState = 'handled' | 'stale' | 'unrelated';

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

const createNetworkWisePenError = (error: AxiosError): WisePenError =>
  createError({
    code: mapNetworkCode(error),
    source: 'network',
    cause: error,
  });

const createHttpWisePenError = (
  error: AxiosError,
  status: number,
  serverMsg: string | undefined,
  authSessionState: AuthSessionErrorState
): WisePenError =>
  createError({
    code: mapHttpCode(status),
    source: 'http',
    serverMsg,
    meta: {
      httpStatus: status,
      authSessionState,
    },
    cause: error,
  });

const createApiWisePenError = (
  error: AxiosError,
  status: number,
  businessCode: number,
  serverMsg: string | undefined,
  authSessionState: AuthSessionErrorState
): WisePenError =>
  createError({
    code: businessCode,
    source: status === 400 || status === 500 ? 'api' : 'http',
    serverMsg,
    meta: {
      httpStatus: status,
      authSessionState,
    },
    cause: error,
  });

export const mapAxiosErrorToWisePenError = (
  error: AxiosError,
  authSessionState: AuthSessionErrorState
): WisePenError => {
  if (!error.response) return createNetworkWisePenError(error);

  const { status, data } = error.response;
  const body = parseApiErrorBody(data);
  const serverMsg = body?.message;
  const businessCode = body?.code;

  if (typeof businessCode === 'number')
    return createApiWisePenError(error, status, businessCode, serverMsg, authSessionState);

  return createHttpWisePenError(error, status, serverMsg, authSessionState);
};
