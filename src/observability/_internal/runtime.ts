import {
  type Attributes,
  context as otelContext,
  SpanStatusCode,
  trace,
  type Tracer,
} from '@opentelemetry/api';
import { type Logger, SeverityNumber } from '@opentelemetry/api-logs';

import type { ErrorAggregation } from './aggregation';
import type { ObservabilityContext } from './context';
import type { ContextSnapshot, ExceptionObservation, TelemetryEvent } from './model';
import {
  buildErrorFingerprint,
  isValidExceptionLocation,
  sanitizeDiagnosticText,
  sanitizePath,
} from './privacy';

const MAX_MESSAGE_LENGTH = 512;
const MAX_STACK_LENGTH = 32_000;
const REQUEST_ID_PATTERN = /^[\w.:-]{1,128}$/;

interface ActiveObservabilityRuntime {
  context: ObservabilityContext;
  aggregation: ErrorAggregation;
  logger: Logger;
  tracer: Tracer;
}

export interface HttpFailureObservation {
  status: number;
  method: string;
  path: string;
  host?: string;
  port?: number;
  requestId?: string;
  businessCode?: number;
  resendCount: number;
  serverMessage?: string;
}

let activeRuntime: ActiveObservabilityRuntime | undefined;

export const setActiveObservabilityRuntime = (
  runtime: ActiveObservabilityRuntime | undefined
): void => {
  activeRuntime = runtime;
};

export const isObservabilityActive = (): boolean => Boolean(activeRuntime);

export const getObservabilityContext = (): ObservabilityContext | undefined =>
  activeRuntime?.context;

export const flushObservabilityEvents = (force = false): void => {
  try {
    activeRuntime?.aggregation.flush(force);
  } catch {
    // 聚合失败不影响业务。
  }
};

const buildBreadcrumbAttribute = (snapshot: ContextSnapshot): string =>
  JSON.stringify(
    snapshot.breadcrumbs.map(({ at, name, attributes }) => ({
      at,
      name,
      attributes,
    }))
  ).slice(0, 8_000);

const getSeverity = (observation: ExceptionObservation): 'WARN' | 'ERROR' =>
  observation.detector === 'react-root-recoverable' ? 'WARN' : 'ERROR';

/** 将应用异常转换成统一事件，所有字段在进入 OTel 前完成脱敏和限长。 */
export const recordExceptionObservation = (observation: ExceptionObservation): void => {
  const runtime = activeRuntime;
  if (!runtime) return;

  try {
    const snapshot = runtime.context.capture();
    const message = sanitizeDiagnosticText(
      observation.source
        ? `${observation.source} failure (${observation.code ?? 'unknown'})`
        : observation.message,
      MAX_MESSAGE_LENGTH
    );
    const stack = observation.stack
      ? sanitizeDiagnosticText(observation.stack, MAX_STACK_LENGTH)
      : undefined;
    const componentStack = observation.componentStack
      ? sanitizeDiagnosticText(observation.componentStack, MAX_STACK_LENGTH)
      : undefined;
    const location = isValidExceptionLocation(observation.location)
      ? {
          ...observation.location,
          filename: sanitizeDiagnosticText(observation.location.filename, 512),
        }
      : undefined;
    const attributes: Attributes = {
      ...snapshot.attributes,
      'error.id': observation.id,
      'error.detector': observation.detector,
      'error.fingerprint': buildErrorFingerprint(observation.errorType, message, stack),
      'exception.type': observation.errorType,
      'exception.message': message,
      'exception.stacktrace': stack,
      'react.component_stack': componentStack,
      'code.file.path': location?.filename,
      'code.line.number': location?.line,
      'code.column.number': location?.column,
      'telemetry.breadcrumbs': buildBreadcrumbAttribute(snapshot),
      'telemetry.breadcrumbs_dropped': snapshot.breadcrumbsDropped,
    };
    if (observation.code !== undefined) attributes['error.code'] = observation.code;
    if (observation.source) attributes['error.source'] = observation.source;

    const event: TelemetryEvent = {
      name: 'frontend.error',
      severity: getSeverity(observation),
      message,
      timestamp: observation.occurredAt,
      attributes,
      context: otelContext.active(),
      exception: {
        type: observation.errorType,
        message,
        stack,
      },
    };
    runtime.aggregation.record(event);
  } catch {
    // 采集失败不得影响原异常处理。
  }
};

/** 保留既有 HTTP 5xx 事件语义，由 API 层提供已解析的协议字段。 */
export const recordHttpFailure = (observation: HttpFailureObservation): void => {
  const runtime = activeRuntime;
  if (!runtime) return;

  try {
    const snapshot = runtime.context.capture();
    const route = snapshot.attributes['page.route'];
    const attributes: Attributes = {
      ...snapshot.attributes,
      'error.type': `HTTP_${observation.status}`,
      'error.source': 'http',
      'http.request.method': observation.method.toUpperCase(),
      'http.request.resend_count': observation.resendCount,
      'http.response.status_code': observation.status,
      'page.path': typeof route === 'string' && route ? route : sanitizePath('/'),
      'url.path': sanitizePath(observation.path),
      'telemetry.breadcrumbs': buildBreadcrumbAttribute(snapshot),
      'telemetry.breadcrumbs_dropped': snapshot.breadcrumbsDropped,
    };
    if (observation.host) attributes['server.address'] = observation.host;
    if (observation.port) attributes['server.port'] = observation.port;
    if (observation.requestId && REQUEST_ID_PATTERN.test(observation.requestId)) {
      attributes['wisepen.request_id'] = observation.requestId;
    }
    if (observation.businessCode !== undefined) {
      attributes['api.business_code'] = observation.businessCode;
    }
    const serverMessage = observation.serverMessage
      ? sanitizeDiagnosticText(observation.serverMessage, MAX_MESSAGE_LENGTH)
      : '';

    const activeSpan = trace.getActiveSpan();
    const span = activeSpan ?? runtime.tracer.startSpan('frontend.http_failure');
    span.setAttributes(attributes);
    span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${observation.status}` });
    span.addEvent('server_error', attributes);
    const logContext = activeSpan
      ? otelContext.active()
      : trace.setSpan(otelContext.active(), span);
    try {
      runtime.logger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: 'ERROR',
        body: `API ${observation.status}`,
        context: logContext,
        attributes: {
          ...attributes,
          'api.server_message': serverMessage,
        },
      });
    } finally {
      if (!activeSpan) span.end();
    }
  } catch {
    // 观测链路失败不得改变原 HTTP 错误处理。
  }
};
