/**
 * 业务异常的统一捕获入口。
 *
 * 负责 support ID、对象去重、取消过滤和 Error 规范化，不负责 OTel 导出。
 */
import { FRONTEND_NETWORK_ERROR } from '@/utils/error/codes';
import { isWisePenError } from '@/utils/error/WisePenError';
import { createUuid } from '@/utils/random/createUuid';

import { isObservabilityActive, recordExceptionObservation } from './pipeline';
import { isValidExceptionLocation } from './privacy';
import type { CaptureExceptionContext, ExceptionObservation } from './types';

const errorIds = new WeakMap<object, string>();
const observedErrors = new WeakSet<object>();
const primitiveIds = new Map<string, { id: string; expiresAt: number }>();
const PRIMITIVE_ID_TTL_MS = 5 * 60_000;
const MAX_PRIMITIVE_IDS = 100;

const isObjectKey = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function';

const createSupportErrorId = (): string => `WPE-${createUuid().slice(0, 8).toUpperCase()}`;
const getPrimitiveKey = (value: unknown): string => `${typeof value}:${String(value)}`;

const rememberPrimitiveId = (value: unknown, id: string): void => {
  const key = getPrimitiveKey(value);
  primitiveIds.delete(key);
  primitiveIds.set(key, { id, expiresAt: Date.now() + PRIMITIVE_ID_TTL_MS });
  if (primitiveIds.size > MAX_PRIMITIVE_IDS) {
    const oldest = primitiveIds.keys().next().value;
    if (oldest !== undefined) primitiveIds.delete(oldest);
  }
};

export const getSupportErrorId = (error: unknown): string => {
  if (!isObjectKey(error)) {
    const key = getPrimitiveKey(error);
    const current = primitiveIds.get(key);
    if (current && current.expiresAt > Date.now()) return current.id;
  } else {
    const current = errorIds.get(error);
    if (current) return current;
  }

  const id = createSupportErrorId();
  if (isObjectKey(error)) errorIds.set(error, id);
  else rememberPrimitiveId(error, id);
  return id;
};

const createCaptureId = (error: unknown): string => {
  if (isObjectKey(error)) return getSupportErrorId(error);
  const id = createSupportErrorId();
  rememberPrimitiveId(error, id);
  return id;
};

export const markExceptionObserved = (error: unknown): void => {
  if (isObjectKey(error)) observedErrors.add(error);
};

const isCanceled = (error: unknown): boolean =>
  (error instanceof Error && ['AbortError', 'CanceledError'].includes(error.name)) ||
  (isWisePenError(error) &&
    error.source === 'network' &&
    error.code === FRONTEND_NETWORK_ERROR.CANCELED);

const readErrorDetails = (
  error: unknown
): {
  type: string;
  message: string;
  stack?: string;
  code?: number;
  source?: string;
} => {
  if (!(error instanceof Error)) {
    return {
      type: 'Unknown',
      message: typeof error === 'string' ? error : 'Unknown error',
    };
  }

  const wisePenError = isWisePenError(error);
  return {
    type: error.name || 'Error',
    message: error.message,
    stack: wisePenError ? error.stack?.split('\n').slice(2).join('\n') : error.stack,
    ...(wisePenError ? { code: error.code, source: error.source } : {}),
  };
};

export const captureException = (error: unknown, context: CaptureExceptionContext): string => {
  const id = createCaptureId(error);
  if (!isObservabilityActive() || isCanceled(error)) return id;
  if (isObjectKey(error)) {
    if (observedErrors.has(error)) return id;
    observedErrors.add(error);
  }

  try {
    const details = readErrorDetails(error);
    const observation: ExceptionObservation = {
      id,
      detector: context.detector,
      operation: context.operation,
      occurredAt: Date.now(),
      errorType: details.type,
      message: details.message,
      stack: details.stack,
      componentStack: context.componentStack,
      location: isValidExceptionLocation(context.location) ? context.location : undefined,
      code: details.code,
      source: details.source,
    };
    recordExceptionObservation(observation);
  } catch {
    // 捕获失败不得改变业务异常处理。
  }
  return id;
};
