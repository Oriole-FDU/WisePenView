import { trace } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { startBrowserSdk } from '@opentelemetry/browser-sdk';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';

import { publicAppConfig } from '@/config/runtimeConfig';

import { getClientAttributes, isTelemetryEnabled } from './runtime';
import { TelemetrySpanProcessor } from './spanProcessor';
import { applyXhrApiAttributes } from './xhrApiTelemetry';

const SERVICE_NAME = 'wisepen-web';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildTelemetryUrlPattern = (value: string): RegExp => {
  const path = value.startsWith('/') ? value : new URL(value).pathname;
  const normalizedPath = path === '/' ? '' : path.replace(/\/+$/, '');
  return new RegExp(`${escapeRegExp(normalizedPath)}/v1/(traces|logs)$`);
};

/** 将显式 API Origin 转为 SDK 所需的锚定正则；字符串配置只接受完整 URL 精确匹配。 */
const buildTracePropagationPatterns = (baseUrls: readonly string[]): RegExp[] =>
  Array.from(new Set(baseUrls.map((baseUrl) => new URL(baseUrl).origin))).map(
    (origin) => new RegExp(`^${escapeRegExp(origin)}(?:/|$)`)
  );

const endpoint = publicAppConfig.observability.otelEndpoint;

const toAbsoluteEndpoint = (value: string): string => {
  const absolute = value.startsWith('/')
    ? new URL(value, window.location.origin).toString()
    : value;
  return absolute.replace(/\/+$/, '');
};

if (isTelemetryEnabled && endpoint) {
  const exportBaseUrl = toAbsoluteEndpoint(endpoint);
  const apiBaseUrls = [publicAppConfig.api.baseUrl, publicAppConfig.api.intranetBaseUrl].filter(
    (value): value is string => Boolean(value)
  );
  const apiOrigins = new Set(apiBaseUrls.map((baseUrl) => new URL(baseUrl).origin));
  const apiTracePropagationPatterns = buildTracePropagationPatterns(apiBaseUrls);
  const telemetryUrlPattern = buildTelemetryUrlPattern(exportBaseUrl);

  try {
    const sdk = startBrowserSdk({
      serviceName: SERVICE_NAME,
      serviceVersion: __APP_VERSION__,
      resourceAttributes: {
        ...getClientAttributes(),
      },
      logs: {
        exportConfig: { url: `${exportBaseUrl}/v1/logs` },
        batchProcessorConfig: { maxQueueSize: 2048, scheduledDelayMillis: 1_000 },
      },
      traces: {
        processors: [new TelemetrySpanProcessor()],
        contextManager: new ZoneContextManager(),
        exportConfig: { url: `${exportBaseUrl}/v1/traces` },
        batchProcessorConfig: { maxQueueSize: 2048, scheduledDelayMillis: 5_000 },
      },
      instrumentations: [
        new FetchInstrumentation({
          ignoreUrls: [telemetryUrlPattern],
          propagateTraceHeaderCorsUrls: apiTracePropagationPatterns,
        }),
        new XMLHttpRequestInstrumentation({
          applyCustomAttributesOnSpan: (span, xhr) => applyXhrApiAttributes(span, xhr, apiOrigins),
          ignoreUrls: [telemetryUrlPattern],
          propagateTraceHeaderCorsUrls: apiTracePropagationPatterns,
        }),
      ],
    });
    if (sdk.invalidConfig) {
      console.warn('[otel] 配置无效，前端遥测未启动。');
    }
  } catch {
    // 可观测性初始化失败不得阻断应用启动。
  }
}

export const tracer = trace.getTracer(SERVICE_NAME);
export const logger = logs.getLogger(SERVICE_NAME);
