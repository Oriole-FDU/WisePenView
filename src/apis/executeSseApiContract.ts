import { buildApiUrl } from '@/apis/buildApiUrl';
import { type ApiContract, parseApiRequest } from '@/apis/contract';
import { applyXDeveloperHeader, awaitAddrReady, notifyAddrFailure } from '@/apis/runtime';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

const toQueryString = (value: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined && item !== null) params.set(key, String(item));
  }
  return params.toString();
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

  try {
    return await fetch(buildApiUrl(endpoint), {
      method: contract.method,
      credentials: 'include',
      headers,
      signal: init?.signal,
      body: contract.requestPlacement === 'body' ? JSON.stringify(request) : undefined,
    });
  } catch (error) {
    notifyAddrFailure();
    throw error;
  }
}
