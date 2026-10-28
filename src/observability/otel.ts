/**
 * OpenTelemetry SDK 与自动网络插桩。
 *
 * 负责 Provider、Exporter 和 Fetch/XHR span 属性清洗；
 * 不负责业务异常语义、聚合预算或应用生命周期监听。
 */
import { type Attributes, context, propagation, type Span, trace } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { startBrowserSdk } from '@opentelemetry/browser-sdk';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';

import { isApiResponseEnvelope } from '@/apis/runtimeContract';
import { buildInfo } from '@/config/buildInfo';
import { publicAppConfig } from '@/config/runtimeConfig';

import { sanitizeRequestUrl } from './privacy';

const SERVICE_NAME = 'wisepen-web';
const MAX_ENVELOPE_LENGTH = 256 * 1024;
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const NUMERIC_SEGMENT_PATTERN = /\/\d+(?=\/|$)/g;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildTelemetryUrlPattern = (value: string): RegExp => {
  const path = value.startsWith('/') ? value : new URL(value).pathname;
  const normalizedPath = path === '/' ? '' : path.replace(/\/+$/, '');
  return new RegExp(`${escapeRegExp(normalizedPath)}/v1/(traces|logs)$`);
};

const buildTracePropagationPatterns = (baseUrls: readonly string[]): RegExp[] =>
  Array.from(new Set(baseUrls.map((baseUrl) => new URL(baseUrl).origin))).map(
    (origin) => new RegExp(`^${escapeRegExp(origin)}(?:/|$)`)
  );

const toAbsoluteEndpoint = (value: string): string => {
  const absolute = value.startsWith('/')
    ? new URL(value, window.location.origin).toString()
    : value;
  return absolute.replace(/\/+$/, '');
};

const normalizeApiEndpoint = (path: string): string =>
  path.replace(UUID_PATTERN, ':id').replace(NUMERIC_SEGMENT_PATTERN, '/:id');

interface SpanWithAttributes extends Span {
  readonly attributes?: Attributes;
}

export const sanitizeSpanUrl = (span: Span): void => {
  const value = (span as SpanWithAttributes).attributes?.['url.full'];
  if (typeof value === 'string') span.setAttribute('url.full', sanitizeRequestUrl(value));
};

const readApiEnvelope = (xhr: XMLHttpRequest) => {
  const contentType = xhr.getResponseHeader('content-type') ?? '';
  if (!contentType.includes('json')) return undefined;

  try {
    const body = xhr.responseText;
    if (!body || body.length > MAX_ENVELOPE_LENGTH) return undefined;
    const parsed: unknown = JSON.parse(body);
    return isApiResponseEnvelope(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const applyXhrAttributes = (
  span: Span,
  xhr: XMLHttpRequest,
  apiOrigins: ReadonlySet<string>
): void => {
  try {
    sanitizeSpanUrl(span);
    if (xhr.responseURL) span.setAttribute('url.full', sanitizeRequestUrl(xhr.responseURL));
    if (!xhr.responseURL) return;

    const url = new URL(xhr.responseURL);
    if (!apiOrigins.has(url.origin)) return;

    const envelope = readApiEnvelope(xhr);
    const attributes: Attributes = {
      'api.endpoint': normalizeApiEndpoint(url.pathname),
      'api.outcome':
        xhr.status >= 200 && xhr.status < 300 && (envelope?.code ?? 200) === 200
          ? 'success'
          : 'failure',
    };
    if (envelope) {
      attributes['api.business_code'] = envelope.code;
      if (envelope.code !== 200) {
        attributes['error.code'] = envelope.code;
        attributes['error.source'] = 'api';
      }
    }
    span.setAttributes(attributes);
  } catch {
    // 自动 span 补充失败不得影响原请求。
  }
};

interface StartOtelOptions {
  resourceAttributes: Attributes;
}

export interface OtelRuntime {
  logger: ReturnType<typeof logs.getLogger>;
  tracer: ReturnType<typeof trace.getTracer>;
  shutdown: () => Promise<void>;
}

export const startOtel = ({ resourceAttributes }: StartOtelOptions): OtelRuntime | undefined => {
  const endpoint = publicAppConfig.observability.otelEndpoint;
  if (!endpoint) return undefined;

  const exportBaseUrl = toAbsoluteEndpoint(endpoint);
  const apiBaseUrls = [publicAppConfig.api.baseUrl, publicAppConfig.api.intranetBaseUrl].filter(
    (value): value is string => Boolean(value)
  );
  const apiOrigins = new Set(apiBaseUrls.map((baseUrl) => new URL(baseUrl).origin));
  const telemetryUrlPattern = buildTelemetryUrlPattern(exportBaseUrl);
  const sdk = startBrowserSdk({
    serviceName: SERVICE_NAME,
    serviceVersion: buildInfo.version,
    resourceAttributes,
    logs: {
      exportConfig: { url: `${exportBaseUrl}/v1/logs` },
      batchProcessorConfig: { maxQueueSize: 2048, scheduledDelayMillis: 1_000 },
    },
    traces: {
      contextManager: new ZoneContextManager(),
      exportConfig: { url: `${exportBaseUrl}/v1/traces` },
      batchProcessorConfig: { maxQueueSize: 2048, scheduledDelayMillis: 5_000 },
    },
    instrumentations: [
      new FetchInstrumentation({
        ignoreUrls: [telemetryUrlPattern],
        propagateTraceHeaderCorsUrls: buildTracePropagationPatterns(apiBaseUrls),
        applyCustomAttributesOnSpan: (span) => sanitizeSpanUrl(span),
      }),
      new XMLHttpRequestInstrumentation({
        ignoreUrls: [telemetryUrlPattern],
        propagateTraceHeaderCorsUrls: buildTracePropagationPatterns(apiBaseUrls),
        applyCustomAttributesOnSpan: (span, xhr) => applyXhrAttributes(span, xhr, apiOrigins),
      }),
    ],
  });
  if (sdk.invalidConfig) return undefined;

  return {
    logger: logs.getLogger(SERVICE_NAME),
    tracer: trace.getTracer(SERVICE_NAME),
    shutdown: async () => {
      try {
        await sdk.shutdown();
      } finally {
        trace.disable();
        logs.disable();
        context.disable();
        propagation.disable();
      }
    },
  };
};
