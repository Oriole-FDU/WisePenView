export type ExceptionDetector =
  | 'react-root-uncaught'
  | 'react-root-recoverable'
  | 'root-fallback'
  | 'route-fallback'
  | 'router-error'
  | 'window-error'
  | 'window-unhandled-rejection'
  | 'application-handled';

export type ExceptionOperation = 'chat.send' | 'chat.stream' | 'chat.recover' | 'chat.resume';

export interface ExceptionLocation {
  filename: string;
  line: number;
  column: number;
}

export interface CaptureExceptionContext {
  detector: ExceptionDetector;
  operation?: ExceptionOperation;
  componentStack?: string;
  location?: ExceptionLocation;
}
