import { createUuid } from '@/utils/random/createUuid';

import { FRONTEND_CLIENT_ERROR, FRONTEND_NETWORK_ERROR } from './codes';
import { isWisePenError } from './WisePenError';

export type ErrorReportOrigin =
  | 'route'
  | 'layout-boundary'
  | 'root-boundary'
  | 'react-uncaught'
  | 'react-recoverable'
  | 'window-error'
  | 'unhandled-rejection'
  | 'handled'
  | 'http';

export interface ErrorOperationContext {
  flow: 'login' | 'drive' | 'editor' | 'chat';
  operation:
    | 'login'
    | 'list'
    | 'list-more'
    | 'skill-save'
    | 'skill-config-save'
    | 'agent-save'
    | 'note-title-save'
    | 'drawio-save'
    | 'office-sdk'
    | 'chat-create'
    | 'chat-send'
    | 'chat-stream';
}

export interface ErrorReportContext extends Partial<ErrorOperationContext> {
  origin: ErrorReportOrigin;
  pathname?: string;
  componentStack?: string;
  location?: { filename: string; line: number; column: number };
  http?: {
    method: string;
    status: number;
    retryCount: number;
    pathname: string;
    businessCode?: number;
    requestId?: string;
  };
}

export interface ErrorReport extends ErrorReportContext {
  id: string;
  occurredAt: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: number;
    source?: string;
  };
}

export type ErrorReporter = (report: ErrorReport) => void | Promise<void>;

const errorIds = new WeakMap<object, string>();
// ponytail: 非对象异常只保留最近 128 个值；需区分同值并发事件时改由捕捉边界传入事件身份。
const primitiveIds = new Map<unknown, string>();
const reportedAt = new WeakMap<object, number>();
let reporter: ErrorReporter | undefined;
const REPORT_DEDUPLICATION_WINDOW_MS = 1000;

const createErrorId = (): string => `WPE-${createUuid().slice(0, 8).toUpperCase()}`;

const isObjectKey = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function';

// Axios 映射只包装一层 WisePenError；复用原异常身份即可。
const errorKey = (error: unknown): unknown =>
  isWisePenError(error) && error.cause instanceof Error ? error.cause : error;

/** 仅过滤已有明确分类的预期拒绝，不根据自由文字猜测。 */
export const isExpectedError = (error: unknown): boolean => {
  if (error instanceof Error && ['AbortError', 'CanceledError'].includes(error.name)) return true;
  if (!isWisePenError(error)) return false;
  // UserError 的登录拒绝以 HTTP 200 回传，不能用 HTTP 状态判断密码错误／账号锁定。
  if (error.source === 'api' && [3111, 3121].includes(error.code)) return true;
  if (error.source === 'network' && error.code === FRONTEND_NETWORK_ERROR.CANCELED) return true;
  if (
    error.source === 'client' &&
    [
      FRONTEND_CLIENT_ERROR.VALIDATION,
      FRONTEND_CLIENT_ERROR.AUTH_SESSION_CHANGED,
      FRONTEND_CLIENT_ERROR.SKILL_CONFIG_REQUIRED,
    ].some((code) => code === error.code)
  )
    return true;
  const status = error.meta?.httpStatus ?? (error.source === 'api' ? error.code : undefined);
  return typeof status === 'number' && [400, 401, 403, 404, 409, 422, 429].includes(status);
};

export const getErrorReportId = (error: unknown): string => {
  error = errorKey(error);
  if (!isObjectKey(error)) {
    const current = primitiveIds.get(error);
    if (current) return current;
    const next = createErrorId();
    if (primitiveIds.size >= 128) primitiveIds.delete(primitiveIds.keys().next().value);
    primitiveIds.set(error, next);
    return next;
  }
  const current = errorIds.get(error);
  if (current) return current;
  const next = createErrorId();
  errorIds.set(error, next);
  return next;
};

const buildErrorReport = (id: string, error: unknown, context: ErrorReportContext): ErrorReport => {
  const errorInfo =
    error instanceof Error
      ? {
          name: error.name || 'Error',
          message: error.message,
          stack: error.stack,
        }
      : {
          name: 'Unknown',
          message: typeof error === 'string' ? error : 'Unknown error',
        };

  return {
    ...context,
    id,
    occurredAt: new Date().toISOString(),
    error: {
      ...errorInfo,
      ...(isWisePenError(error) ? { code: error.code, source: error.source } : {}),
    },
  };
};

/** 配置后端上报实现；未配置时 reportError 保持静默。 */
export const configureErrorReporter = (nextReporter?: ErrorReporter): (() => void) => {
  reporter = nextReporter;
  return () => {
    if (reporter === nextReporter) reporter = undefined;
  };
};

/** 错误上报不得反向影响当前错误处理流程。 */
export const reportError = (error: unknown, context: ErrorReportContext): string => {
  const errorId = getErrorReportId(error);
  try {
    const currentReporter = reporter;
    const key = errorKey(error);
    if (!currentReporter || isExpectedError(error) || isExpectedError(key)) return errorId;
    if (isObjectKey(key)) {
      const now = performance.now();
      const lastReportedAt = reportedAt.get(key);
      if (lastReportedAt !== undefined && now - lastReportedAt < REPORT_DEDUPLICATION_WINDOW_MS) {
        return errorId;
      }
      reportedAt.set(key, now);
    }
    void Promise.resolve(currentReporter(buildErrorReport(errorId, error, context))).catch(
      () => undefined
    );
  } catch {
    // 后端上报接入失败时保持静默，避免形成二次异常。
  }
  return errorId;
};

/** 安装浏览器最后一道异步异常监听；只上报，不阻止浏览器默认行为。 */
export const installGlobalErrorReporting = (): (() => void) => {
  const handleWindowError = (event: ErrorEvent) => {
    reportError(event.error ?? event.message, {
      origin: 'window-error',
      pathname: window.location.pathname,
      location: { filename: event.filename, line: event.lineno, column: event.colno },
    });
  };
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportError(event.reason, {
      origin: 'unhandled-rejection',
      pathname: window.location.pathname,
    });
  };

  window.addEventListener('error', handleWindowError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  return () => {
    window.removeEventListener('error', handleWindowError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
};
