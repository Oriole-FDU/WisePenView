import { context, isSpanContextValid, SpanStatusCode, trace } from '@opentelemetry/api';
import { SeverityNumber } from '@opentelemetry/api-logs';

import { configureErrorReporter } from '@/utils/error';
import { FRONTEND_NETWORK_ERROR } from '@/utils/error/codes';
import { isWisePenError } from '@/utils/error/WisePenError';

import { getRequestError } from '../http';
import { logger, tracer } from './otel';
import {
  installTelemetrySink,
  isTelemetryEnabled,
  recordBreadcrumb,
  recordTelemetryEvent,
} from './runtime';
import { sanitizeDiagnosticText } from './sanitize';

const SEVERITY = {
  INFO: SeverityNumber.INFO,
  WARN: SeverityNumber.WARN,
  ERROR: SeverityNumber.ERROR,
} as const;

/** 所有日志共用出口，日志与错误 span 使用同一份身份、页面和请求现场。 */
export const installOtelErrorReporter = (): (() => void) => {
  if (!isTelemetryEnabled) return () => undefined;
  const stopSink = installTelemetrySink((event) => {
    const attributes = { ...event.attributes, 'event.name': event.name };
    const eventContext = event.context ?? context.active();
    const parent = trace.getSpanContext(eventContext);
    const span =
      event.attributes['error.id'] && !(parent && isSpanContextValid(parent))
        ? tracer.startSpan(
            event.name,
            {
              attributes,
            },
            eventContext
          )
        : undefined;
    if (span && event.severity === 'ERROR') {
      span.recordException({
        name: String(event.attributes['error.type'] ?? 'Error'),
        message: event.message,
        stack:
          typeof event.attributes['error.stack'] === 'string'
            ? event.attributes['error.stack']
            : undefined,
      });
      span.setStatus({ code: SpanStatusCode.ERROR, message: event.message });
    }
    try {
      logger.emit({
        timestamp: new Date(event.timestamp),
        severityNumber: SEVERITY[event.severity],
        severityText: event.severity,
        body: event.message,
        context: span ? trace.setSpan(eventContext, span) : eventContext,
        attributes,
      });
    } finally {
      span?.end();
    }
  });

  const stopReporter = configureErrorReporter((report, error) => {
    const request = getRequestError(error);
    if (request?.reported) return;
    if (
      report.origin === 'handled' &&
      ((error instanceof Error && ['AbortError', 'CanceledError'].includes(error.name)) ||
        (isWisePenError(error) &&
          error.source === 'network' &&
          error.code === FRONTEND_NETWORK_ERROR.CANCELED))
    )
      return;
    // 业务异常不复制可能带输入内容的服务端文案；未知运行时异常只保留脱敏诊断文本。
    const message = isWisePenError(error)
      ? `${error.source} failure (${error.code})`
      : sanitizeDiagnosticText(report.error.message);
    const stack = sanitizeDiagnosticText(report.error.stack ?? '', 32_000);
    const topFrame = stack.split('\n')[1]?.trim() ?? '';
    recordBreadcrumb('runtime.error', { 'error.kind': report.origin }, request?.snapshot);
    recordTelemetryEvent(
      'frontend.error',
      report.origin === 'react-recoverable' ? 'WARN' : 'ERROR',
      message,
      {
        'error.id': report.id,
        'error.type': report.error.name,
        'error.message': message,
        'error.stack': isWisePenError(error) ? stack.split('\n').slice(1).join('\n') : stack,
        'error.fingerprint': `${report.error.name}:${message}:${topFrame}`.slice(0, 512),
        'error.origin': report.origin,
        'operation.name': report.operation,
        'error.code': report.error.code,
        'error.source': report.error.source,
        'react.component_stack': sanitizeDiagnosticText(report.componentStack ?? '', 32_000),
      },
      { owner: request?.snapshot, aggregate: true }
    );
  });
  return () => {
    stopReporter();
    stopSink();
  };
};
