import { FRONTEND_CLIENT_ERROR } from '@/utils/error/codes';
import { WisePenError } from '@/utils/error/WisePenError';

/** Service 层客户端校验失败时抛出 */
export const createClientError = (
  code: number = FRONTEND_CLIENT_ERROR.VALIDATION,
  meta?: Record<string, unknown>,
  cause?: unknown
): WisePenError =>
  new WisePenError({
    code,
    source: 'client',
    meta,
    cause,
  });
