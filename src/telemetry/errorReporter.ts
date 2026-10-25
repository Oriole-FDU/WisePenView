import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import { SeverityNumber } from '@opentelemetry/api-logs';

import { configureErrorReporter } from '@/utils/error';

import { isTelemetryEnabled, logger, tracer } from './otel';
import { safeErrorAttributes } from './privacy';

const reportedAt = new Map<string, number>();

/** 一分钟内最多保留 20 个已上报的 fingerprint；同一状态用于去重和总量限制。 */
export const allowErrorReport = (fingerprint: string, now = performance.now()): boolean => {
  for (const [key, time] of reportedAt) {
    if (now - time >= 60_000) reportedAt.delete(key);
  }
  if (reportedAt.has(fingerprint) || reportedAt.size >= 20) return false;
  reportedAt.set(fingerprint, now);
  return true;
};

/** 所有应用错误共用白名单与限流出口；原始 message、cause 和 params 不进入 SDK。 */
export const installOtelErrorReporter = (): (() => void) => {
  if (!isTelemetryEnabled) return () => undefined;
  return configureErrorReporter((report) => {
    const attributes = safeErrorAttributes(report);
    if (!allowErrorReport(String(attributes['error.fingerprint']))) return;
    const span = tracer.startSpan('frontend.error', { attributes });
    try {
      span.setStatus({ code: SpanStatusCode.ERROR });
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: 'ERROR',
        body: 'frontend.error',
        context: trace.setSpan(context.active(), span),
        attributes,
      });
    } finally {
      span.end();
    }
  });
};
