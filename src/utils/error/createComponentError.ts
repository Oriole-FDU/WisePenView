import { captureException } from '@/observability';
import { FRONTEND_COMPONENT_ERROR, type FrontendComponentErrorCode } from '@/utils/error/codes';
import { WisePenError } from '@/utils/error/WisePenError';

/** 创建 Component / View 层错误（source: component），并在产生时立即上报。 */
export const createComponentError = (
  code: FrontendComponentErrorCode = FRONTEND_COMPONENT_ERROR.VALIDATION,
  meta?: Record<string, unknown>,
  cause?: unknown
): WisePenError => {
  const error = new WisePenError({
    code,
    source: 'component',
    meta,
    cause,
  });
  captureException(error, { detector: 'error-created' });
  return error;
};
