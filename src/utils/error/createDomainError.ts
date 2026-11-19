import { captureException } from '@/observability';
import { FRONTEND_DOMAIN_ERROR, type FrontendDomainErrorCode } from '@/utils/error/codes';
import { WisePenError } from '@/utils/error/WisePenError';

/** 创建 Domain 层错误（source: domain），并在产生时立即上报。 */
export const createDomainError = (
  code: FrontendDomainErrorCode = FRONTEND_DOMAIN_ERROR.VALIDATION,
  meta?: Record<string, unknown>,
  cause?: unknown
): WisePenError => {
  const error = new WisePenError({
    code,
    source: 'domain',
    meta,
    cause,
  });
  captureException(error, { detector: 'error-created' });
  return error;
};
