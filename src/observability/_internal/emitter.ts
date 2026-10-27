import { context as otelContext, SpanStatusCode, trace, type Tracer } from '@opentelemetry/api';
import { type Logger, SeverityNumber } from '@opentelemetry/api-logs';

import type { ObservationSeverity, TelemetrySink } from './model';

const SEVERITY_NUMBER: Record<ObservationSeverity, SeverityNumber> = {
  INFO: SeverityNumber.INFO,
  WARN: SeverityNumber.WARN,
  ERROR: SeverityNumber.ERROR,
};

/** 将统一事件映射到 OTel 日志；普通异常优先附着在当前 span 上。 */
export const createOtelEventSink = (tracer: Tracer, logger: Logger): TelemetrySink => {
  return (event) => {
    event.attributes = { ...event.attributes, 'event.name': event.name };
    const originalContext = event.context ?? otelContext.active();
    let span = trace.getSpan(originalContext);
    let spanContext = originalContext;
    let ownsSpan = false;

    if (!span && event.name === 'frontend.error') {
      span = tracer.startSpan('frontend.error', { attributes: event.attributes }, originalContext);
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

    const logContext = span ? trace.setSpan(spanContext, span) : spanContext;
    try {
      logger.emit({
        timestamp: new Date(event.timestamp),
        severityNumber: SEVERITY_NUMBER[event.severity],
        severityText: event.severity,
        body: event.message,
        context: logContext,
        attributes: event.attributes,
      });
    } finally {
      if (ownsSpan) span?.end();
    }
  };
};
