/**
 * observability 的公共类型与内部事件模型。
 *
 * 这里不包含运行时状态或 OTel 实现，只描述各层之间传递的数据形状。
 */
import type { Attributes, Context } from '@opentelemetry/api';

export type ExceptionDetector =
  | 'react-root-uncaught'
  | 'react-root-recoverable'
  | 'root-fallback'
  | 'route-fallback'
  | 'router-error'
  | 'window-error'
  | 'window-unhandled-rejection'
  | 'application-handled';

export type ExceptionOperation =
  | 'chat.send'
  | 'chat.stream'
  | 'chat.recover'
  | 'chat.resume'
  | 'office.sdk'
  | 'drawio.save'
  | 'skill.save';

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

export interface ExceptionObservation {
  id: string;
  detector: ExceptionDetector;
  operation?: ExceptionOperation;
  occurredAt: number;
  errorType: string;
  message: string;
  stack?: string;
  componentStack?: string;
  location?: ExceptionLocation;
  code?: number;
  source?: string;
}

export interface ExceptionDetails {
  type: string;
  message: string;
  stack?: string;
}

export type ObservationSeverity = 'INFO' | 'WARN' | 'ERROR';

export interface TelemetryEvent {
  name: string;
  severity: ObservationSeverity;
  message: string;
  timestamp: number;
  attributes: Attributes;
  context?: Context;
  exception?: ExceptionDetails;
}

export type TelemetrySink = (event: TelemetryEvent) => void;

export interface ContextSnapshot {
  attributes: Attributes;
  breadcrumbs: readonly Breadcrumb[];
  breadcrumbsDropped: number;
}

export interface Breadcrumb {
  at: number;
  name: string;
  attributes: Attributes;
}
