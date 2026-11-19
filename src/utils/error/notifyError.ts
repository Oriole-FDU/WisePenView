import { toast } from '@heroui/react';

import { captureException } from '@/observability';

import { FRONTEND_CLIENT_ERROR } from './codes';
import { createClientError } from './createClientError';
import { parseErrorMessage } from './parseErrorMessage';

type ErrorToastLevel = 'danger' | 'warning';

interface NotifyErrorOptions {
  level?: ErrorToastLevel;
  message?: string;
}

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  return createClientError(
    FRONTEND_CLIENT_ERROR.INTERNAL_STATE,
    { reason: '错误提示收到非 Error 值' },
    error
  );
};

/** 统一消费错误：规范错误值、记录一次消费行为并展示错误 Toast。 */
export const notifyError = (error: unknown, options: NotifyErrorOptions = {}): void => {
  const normalizedError = normalizeError(error);
  if (normalizedError === error) {
    captureException(normalizedError, { detector: 'error-consumed' });
  }
  const message = options.message ?? parseErrorMessage(normalizedError);
  if (options.level === 'warning') {
    toast.warning(message);
    return;
  }
  toast.danger(message);
};

/** 静态错误文案也通过统一入口展示，禁止业务代码直接调用错误 Toast。 */
export const notifyErrorMessage = (message: string, level: ErrorToastLevel = 'danger'): void => {
  if (level === 'warning') {
    toast.warning(message);
    return;
  }
  toast.danger(message);
};
