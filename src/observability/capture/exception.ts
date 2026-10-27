import { FRONTEND_NETWORK_ERROR } from '@/utils/error/codes';
import { isWisePenError } from '@/utils/error/WisePenError';
import { createUuid } from '@/utils/random/createUuid';

import { isValidExceptionLocation } from '../_internal/privacy';
import { isObservabilityActive, recordExceptionObservation } from '../_internal/runtime';
import type { CaptureExceptionContext, ExceptionLocation } from '../publicTypes';

const errorIds = new WeakMap<object, string>();
const capturedErrors = new WeakSet<object>();
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
    const id = createSupportErrorId();
    rememberPrimitiveId(error, id);
    return id;
  }
  const current = errorIds.get(error);
  if (current) return current;
  const next = createSupportErrorId();
  errorIds.set(error, next);
  return next;
};

const createCaptureId = (error: unknown): string => {
  if (isObjectKey(error)) return getSupportErrorId(error);
  const id = createSupportErrorId();
  rememberPrimitiveId(error, id);
  return id;
};

const readErrorDetails = (
  error: unknown
): {
  type: string;
  message: string;
  stack?: string;
  code?: number;
  source?: string;
} => {
  if (error instanceof Error) {
    const wisePenError = isWisePenError(error);
    return {
      type: error.name || 'Error',
      message: error.message,
      stack: wisePenError ? error.stack?.split('\n').slice(1).join('\n') : error.stack,
      ...(wisePenError ? { code: error.code, source: error.source } : {}),
    };
  }
  return {
    type: 'Unknown',
    message: typeof error === 'string' ? error : 'Unknown error',
  };
};

const normalizeLocation = (
  location: ExceptionLocation | undefined
): ExceptionLocation | undefined => (isValidExceptionLocation(location) ? location : undefined);

const isCanceled = (error: unknown): boolean =>
  (error instanceof Error && ['AbortError', 'CanceledError'].includes(error.name)) ||
  (isWisePenError(error) &&
    error.source === 'network' &&
    error.code === FRONTEND_NETWORK_ERROR.CANCELED);

/** 记录捕获到的异常；本函数不负责 Exporter、UI 文案或业务恢复。 */
export const captureException = (error: unknown, context: CaptureExceptionContext): string => {
  const id = createCaptureId(error);
  if (!isObservabilityActive()) return id;
  if (isCanceled(error)) return id;

  if (isObjectKey(error)) {
    if (capturedErrors.has(error)) return id;
    capturedErrors.add(error);
  }

  try {
    const details = readErrorDetails(error);
    recordExceptionObservation({
      id,
      detector: context.detector,
      operation: context.operation,
      occurredAt: Date.now(),
      errorType: details.type,
      message: details.message,
      stack: details.stack,
      componentStack: context.componentStack,
      location: normalizeLocation(context.location),
      code: details.code,
      source: details.source,
    });
  } catch {
    // 捕获层必须保持静默，不能反向影响业务异常。
  }
  return id;
};
