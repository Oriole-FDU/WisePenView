import { parseApiErrorBody } from '@/apis/apiError';
import { buildApiUrl } from '@/apis/buildApiUrl';
import { type ApiContract, parseApiRequest } from '@/apis/contract';
import { applyXDeveloperHeader, awaitAddrReady, notifyAddrFailure } from '@/apis/runtime';
import {
  createClientError,
  FRONTEND_CLIENT_ERROR,
  FRONTEND_NETWORK_ERROR,
  WisePenError,
} from '@/utils/error';

const toQueryString = (value: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined && item !== null) params.set(key, String(item));
  }
  return params.toString();
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const mapHttpStatus = (status: number): number => {
  if (status === 400) return FRONTEND_NETWORK_ERROR.BAD_REQUEST;
  if (status === 500) return FRONTEND_NETWORK_ERROR.SERVER;
  return FRONTEND_NETWORK_ERROR.HTTP;
};

const rejectUnsuccessfulResponse = async (
  response: Response,
  contractName: string
): Promise<void> => {
  if (response.ok) return;

  const body = parseApiErrorBody(await parseResponseBody(response));
  throw new WisePenError({
    code: body?.code ?? mapHttpStatus(response.status),
    source: body?.code === undefined ? 'http' : 'api',
    serverMsg: body?.message || response.statusText || undefined,
    meta: {
      contract: contractName,
      httpStatus: response.status,
    },
  });
};

/**
 * SSE Contract 只负责请求校验与受控传输；流事件由专用归一化器逐条校验。
 */
export async function executeSseApiContract<Request, ResponseData>(
  contract: ApiContract<Request, ResponseData>,
  value: unknown,
  init?: Pick<RequestInit, 'signal'>
): Promise<Response> {
  if (contract.transport !== 'sse') {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `${contract.name} 不是 SSE Contract`,
    });
  }
  const request = parseApiRequest(contract, value);
  await awaitAddrReady();

  const query =
    contract.requestPlacement === 'query' ? toQueryString(request as Record<string, unknown>) : '';
  const endpoint = `${contract.endpoint}${query ? `?${query}` : ''}` as `/${string}`;
  const headers = applyXDeveloperHeader(new Headers({ Accept: 'text/event-stream' }));
  if (contract.requestPlacement === 'body') headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(buildApiUrl(endpoint), {
      method: contract.method,
      credentials: 'include',
      headers,
      signal: init?.signal,
      body: contract.requestPlacement === 'body' ? JSON.stringify(request) : undefined,
    });
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    notifyAddrFailure();
    throw error;
  }
  await rejectUnsuccessfulResponse(response, contract.name);
  return response;
}
