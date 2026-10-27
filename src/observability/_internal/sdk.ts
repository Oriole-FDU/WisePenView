import type { Attributes } from '@opentelemetry/api';
import { type Span, trace, type Tracer } from '@opentelemetry/api';
import { type Logger, logs } from '@opentelemetry/api-logs';
import { startBrowserSdk } from '@opentelemetry/browser-sdk';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';

import { publicAppConfig } from '@/config/runtimeConfig';

const SERVICE_NAME = 'wisepen-web';

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

interface StartObservabilitySdkOptions {
  resourceAttributes: Attributes;
  applyXhrApiAttributes?: (span: Span, xhr: XMLHttpRequest) => void;
}

interface ObservabilitySdk {
  logger: Logger;
  tracer: Tracer;
  shutdown: () => Promise<void>;
}

export const startObservabilitySdk = ({
  resourceAttributes,
  applyXhrApiAttributes,
}: StartObservabilitySdkOptions): ObservabilitySdk | undefined => {
  const endpoint = publicAppConfig.observability.otelEndpoint;
  if (!endpoint) return undefined;

  const exportBaseUrl = toAbsoluteEndpoint(endpoint);
  const apiBaseUrls = [publicAppConfig.api.baseUrl, publicAppConfig.api.intranetBaseUrl].filter(
    (value): value is string => Boolean(value)
  );
  const telemetryUrlPattern = buildTelemetryUrlPattern(exportBaseUrl);
  const sdk = startBrowserSdk({
    serviceName: SERVICE_NAME,
    serviceVersion: __APP_VERSION__,
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
      }),
      new XMLHttpRequestInstrumentation({
        applyCustomAttributesOnSpan: (span, xhr) => applyXhrApiAttributes?.(span, xhr),
        ignoreUrls: [telemetryUrlPattern],
        propagateTraceHeaderCorsUrls: buildTracePropagationPatterns(apiBaseUrls),
      }),
    ],
  });
  if (sdk.invalidConfig) return undefined;

  return {
    logger: logs.getLogger(SERVICE_NAME),
    tracer: trace.getTracer(SERVICE_NAME),
    shutdown: () => sdk.shutdown(),
  };
};
