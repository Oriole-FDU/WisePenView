/**
 * 无 SDK 副作用的业务异常捕获入口。
 *
 * React 适配器从 `react.tsx` 引用，用户身份从 `context.ts` 引用，安装器从
 * `install.ts` 引用；不要在本文件 re-export 这些有独立生命周期的模块。
 */
export { captureException, getSupportErrorId } from './capture';
export type {
  CaptureExceptionContext,
  ExceptionDetector,
  ExceptionLocation,
  ExceptionOperation,
} from './types';
