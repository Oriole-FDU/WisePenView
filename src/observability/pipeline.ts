/**
 * 遥测事件管线与 OTel Log/Span 映射。
 *
 * 负责捕获上下文快照、隐私清洗、异常事件规范化和统一出口；
 * 不负责安装监听器，也不负责业务恢复和用户提示。
 */
import {
  type Attributes,
  type Context,
  context as otelContext,
  SpanStatusCode,
  trace,
  type Tracer,
} from '@opentelemetry/api';
import { type Logger, SeverityNumber } from '@opentelemetry/api-logs';

import { TelemetryAggregation } from './aggregation';
import type { ObservabilityContext } from './context';
import { buildErrorFingerprint, isValidExceptionLocation, sanitizeDiagnosticText } from './privacy';
import type {
  ContextSnapshot,
  ExceptionObservation,
  ObservationSeverity,
  TelemetryEvent,
} from './types';

const MAX_MESSAGE_LENGTH = 512;
const MAX_STACK_LENGTH = 32_000;

const compactAttributes = (attributes: Attributes): Attributes =>
  Object.fromEntries(Object.entries(attributes).filter(([, value]) => value !== undefined));

const SEVERITY_NUMBER: Record<ObservationSeverity, SeverityNumber> = {
  INFO: SeverityNumber.INFO,
  WARN: SeverityNumber.WARN,
  ERROR: SeverityNumber.ERROR,
};

interface ActivePipeline {
  aggregation: TelemetryAggregation;
  context: ObservabilityContext;
  tracer: Tracer;
}

let activePipeline: ActivePipeline | undefined;

const serializeBreadcrumbs = (snapshot: ContextSnapshot): string => {
  const entries = snapshot.breadcrumbs.map(({ at, name, attributes }) =>
    JSON.stringify({ at, name, attributes })
  );
  let serialized = '[';
  for (const entry of entries) {
    const next = `${serialized === '[' ? '' : ','}${entry}`;
    if (serialized.length + next.length > 7_990) break;
    serialized += next;
  }
  return `${serialized}]`;
};

const createOtelSink =
  (tracer: Tracer, logger: Logger) =>
  (event: TelemetryEvent): void => {
    const attributes = { ...event.attributes, 'event.name': event.name };
    const originalContext = event.context ?? otelContext.active();
    let span = trace.getSpan(originalContext);
    let spanContext = originalContext;
    let ownsSpan = false;

    if (!span && ['frontend.error', 'frontend.request_failure'].includes(event.name)) {
      span = tracer.startSpan(event.name, { attributes }, originalContext);
      spanContext = trace.setSpan(originalContext, span);
      event.context = spanContext;
      ownsSpan = true;
    }

    if (span && event.exception) {
      span.recordException({
        name: event.exception.type,
        message: event.exception.message,
        stack: event.exception.stack,
      });
      if (event.severity === 'ERROR') {
        span.setStatus({ code: SpanStatusCode.ERROR, message: event.exception.message });
      }
    }
    if (span && event.name === 'frontend.request_failure') {
      span.setStatus({ code: SpanStatusCode.ERROR, message: event.message });
    }

    const logContext = span ? trace.setSpan(spanContext, span) : spanContext;
    try {
      logger.emit({
        timestamp: new Date(event.timestamp),
        severityNumber: SEVERITY_NUMBER[event.severity],
        severityText: event.severity,
        body: event.message,
        context: logContext,
        attributes,
      });
    } finally {
      if (ownsSpan) span?.end();
    }
  };

export const startPipeline = (
  context: ObservabilityContext,
  tracer: Tracer,
  logger: Logger
): (() => void) => {
  const pipeline: ActivePipeline = {
    context,
    aggregation: new TelemetryAggregation(createOtelSink(tracer, logger)),
    tracer,
  };
  activePipeline = pipeline;
  return () => {
    pipeline.aggregation.flush(true);
    if (activePipeline === pipeline) activePipeline = undefined;
  };
};

export const isObservabilityActive = (): boolean => Boolean(activePipeline);

export const flushObservabilityEvents = (force = false): void => {
  try {
    activePipeline?.aggregation.flush(force);
  } catch {
    // 聚合失败不得影响业务。
  }
};

export interface RequestTracingHandles {
  context: Context;
  snapshot: ContextSnapshot;
  tracer: Tracer;
}

export const getRequestTracingHandles = (): RequestTracingHandles | undefined => {
  const pipeline = activePipeline;
  if (!pipeline) return undefined;
  return {
    context: otelContext.active(),
    snapshot: pipeline.context.capture(),
    tracer: pipeline.tracer,
  };
};

export const recordRequestBreadcrumb = (
  name: string,
  attributes: Attributes,
  ownerSessionId: unknown
): void => {
  try {
    const pipeline = activePipeline;
    if (!pipeline) return;
    const current = pipeline.context.capture();
    if (current.attributes['session.id'] !== ownerSessionId) return;
    pipeline.context.addBreadcrumb(name, attributes);
  } catch {
    // 近期事件补充失败不得影响请求。
  }
};

export const emitRequestEvent = (event: TelemetryEvent): boolean => {
  try {
    if (!activePipeline) return false;
    activePipeline.aggregation.record(event);
    return true;
  } catch {
    // 请求观测失败不得影响原始请求。
    return false;
  }
};

const getSeverity = (observation: ExceptionObservation): 'WARN' | 'ERROR' =>
  observation.detector === 'react-root-recoverable' ||
  observation.detector === 'application-handled'
    ? 'WARN'
    : 'ERROR';

export const recordExceptionObservation = (observation: ExceptionObservation): void => {
  const pipeline = activePipeline;
  if (!pipeline) return;

  try {
    const snapshot = pipeline.context.capture();
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
    const fingerprint =
      observation.source && observation.code !== undefined
        ? `${observation.errorType}:${observation.source}:${observation.code}:${observation.operation ?? ''}`.slice(
            0,
            512
          )
        : buildErrorFingerprint(observation.errorType, message, stack);
    const attributes = compactAttributes({
      ...snapshot.attributes,
      'error.id': observation.id,
      'error.detector': observation.detector,
      'operation.name': observation.operation,
      'error.fingerprint': fingerprint,
      'exception.type': observation.errorType,
      'exception.message': message,
      'exception.stacktrace': stack,
      'react.component_stack': componentStack,
      'code.file.path': location?.filename,
      'code.line.number': location?.line,
      'code.column.number': location?.column,
      'telemetry.breadcrumbs': serializeBreadcrumbs(snapshot),
      'telemetry.breadcrumbs_dropped': snapshot.breadcrumbsDropped,
    });
    if (observation.code !== undefined) attributes['error.code'] = observation.code;
    if (observation.source) attributes['error.source'] = observation.source;

    pipeline.aggregation.record({
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
    });
  } catch {
    // 采集失败不得影响原始异常处理。
  }
};
