import { captureException } from '../capture/exception';

const readLocation = (event: ErrorEvent) =>
  event.filename?.trim()
    ? {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      }
    : undefined;

/** 安装浏览器最后一道异步异常监听；不阻止浏览器默认行为。 */
export const installGlobalExceptionCapture = (): (() => void) => {
  const handleWindowError = (event: ErrorEvent): void => {
    captureException(event.error ?? event.message, {
      detector: 'window-error',
      location: readLocation(event),
    });
  };
  const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    captureException(event.reason, {
      detector: 'window-unhandled-rejection',
    });
  };

  window.addEventListener('error', handleWindowError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  return () => {
    window.removeEventListener('error', handleWindowError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
};
