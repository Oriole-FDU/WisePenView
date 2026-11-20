/**
 * 错误消费统一入口：按错误码解析文案并展示 Toast。
 *
 * 唯一契约（两步，禁止内联 create*Error）：
 * ```ts
 * const error = createComponentError(FRONTEND_COMPONENT_ERROR.COPY_FAILED);
 * reportError({ error, level: 'danger' });
 * ```
 *
 * 错误对象由 Domain（createDomainError）或 Component（createComponentError）
 * 或传输层构造；报告侧不再手写 message。
 */
import { toast } from '@heroui/react';

import { captureException } from '@/observability';

import { FRONTEND_COMPONENT_ERROR } from './codes';
import { createComponentError } from './createComponentError';
import { parseErrorMessage } from './parseErrorMessage';

type ErrorToastLevel = 'danger' | 'warning';

export interface ReportErrorInput {
  error: unknown;
  level: ErrorToastLevel;
}

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  return createComponentError(FRONTEND_COMPONENT_ERROR.INTERNAL_STATE, { cause: error });
};

export const reportError = ({ error, level }: ReportErrorInput): void => {
  const normalizedError = normalizeError(error);
  captureException(normalizedError, { detector: 'error-consumed' });

  const message = parseErrorMessage(normalizedError);
  if (level === 'warning') {
    toast.warning(message);
    return;
  }
  toast.danger(message);
};
