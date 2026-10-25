import { createUuid } from '@/utils/random/createUuid';

import { isWisePenError } from './WisePenError';

export type ErrorReportOrigin =
  | 'route'
  | 'layout-boundary'
  | 'root-boundary'
  | 'react-uncaught'
  | 'react-recoverable'
  | 'window-error'
  | 'unhandled-rejection';

export interface ErrorReportContext {
  origin: ErrorReportOrigin;
  pathname?: string;
  componentStack?: string;
}

export interface ErrorReport {
  id: string;
  occurredAt: string;
  origin: ErrorReportOrigin;
  pathname?: string;
  componentStack?: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: number;
    source?: string;
  };
}

export type ErrorReporter = (report: ErrorReport, error: unknown) => void | Promise<void>;

const errorIds = new WeakMap<object, string>();
const reportedAt = new WeakMap<object, number>();
let reporter: ErrorReporter | undefined;
const REPORT_DEDUPLICATION_WINDOW_MS = 1000;

const createErrorId = (): string => `WPE-${createUuid().slice(0, 8).toUpperCase()}`;

const isObjectKey = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function';

export const getErrorReportId = (error: unknown): string => {
  if (!isObjectKey(error)) return createErrorId();
  const current = errorIds.get(error);
  if (current) return current;
  const next = createErrorId();
  errorIds.set(error, next);
  return next;
};

const buildErrorReport = (error: unknown, context: ErrorReportContext): ErrorReport => {
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
    id: getErrorReportId(error),
    occurredAt: new Date().toISOString(),
    origin: context.origin,
    pathname: context.pathname,
    componentStack: context.componentStack,
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
  const currentReporter = reporter;
  if (!currentReporter) return errorId;

  if (isObjectKey(error)) {
    const now = Date.now();
    const lastReportedAt = reportedAt.get(error);
    if (lastReportedAt !== undefined && now - lastReportedAt < REPORT_DEDUPLICATION_WINDOW_MS) {
      return errorId;
    }
    reportedAt.set(error, now);
  }

  try {
    void Promise.resolve(currentReporter(buildErrorReport(error, context), error)).catch(
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
