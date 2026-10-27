export type ExceptionDetector =
  | 'react-root-uncaught'
  | 'react-root-recoverable'
  | 'root-fallback'
  | 'route-fallback'
  | 'router-error'
  | 'window-error'
  | 'window-unhandled-rejection';

export interface ExceptionLocation {
  filename: string;
  line: number;
  column: number;
}

export interface CaptureExceptionContext {
  detector: ExceptionDetector;
  componentStack?: string;
  location?: ExceptionLocation;
}
