import { parseApiErrorBody } from '@/apis/apiError';
import { FRONTEND_NETWORK_ERROR } from '@/utils/error/codes';
import { WisePenError } from '@/utils/error/WisePenError';
import type { AxiosError } from 'axios';

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

const buildFallbackMessage = (
  status: number,
  serverMsg: string | undefined,
  fallback: string
): string =>
  serverMsg ?? (status === 400 ? '请求参数错误' : status === 500 ? '服务器错误' : fallback);

const createNetworkWisePenError = (error: AxiosError): WisePenError =>
  new WisePenError({
    code: mapNetworkCode(error),
    source: 'network',
    message: error.message,
    cause: error,
  });

const createHttpWisePenError = (
  error: AxiosError,
  status: number,
  serverMsg: string | undefined
): WisePenError => {
  const fallbackMsg = buildFallbackMessage(status, serverMsg, error.message);

  return new WisePenError({
    code: mapHttpCode(status),
    source: 'http',
    serverMsg: fallbackMsg,
    message: fallbackMsg,
    cause: error,
  });
};

const createApiWisePenError = (
  error: AxiosError,
  status: number,
  businessCode: number,
  serverMsg: string | undefined
): WisePenError =>
  new WisePenError({
    code: businessCode,
    source: status === 400 || status === 500 ? 'api' : 'http',
    serverMsg,
    message: serverMsg ?? error.message,
    cause: error,
  });

export const mapAxiosErrorToWisePenError = (error: AxiosError): WisePenError => {
  if (!error.response) return createNetworkWisePenError(error);

  const { status, data } = error.response;
  const body = parseApiErrorBody(data);
  const serverMsg = body?.message;
  const businessCode = body?.code;

  if (typeof businessCode === 'number')
    return createApiWisePenError(error, status, businessCode, serverMsg);

  return createHttpWisePenError(error, status, serverMsg);
};
