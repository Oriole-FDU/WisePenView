import type { Attributes, Span } from '@opentelemetry/api';

import { isApiResponseEnvelope } from '@/apis/runtimeContract';

const MAX_ENVELOPE_LENGTH = 256 * 1024;
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const NUMERIC_SEGMENT_PATTERN = /\/\d+(?=\/|$)/g;

const normalizeApiEndpoint = (path: string): string =>
  path.replace(UUID_PATTERN, ':id').replace(NUMERIC_SEGMENT_PATTERN, '/:id');

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

/**
 * 在自动 XHR span 结束前补充 API 语义。
 *
 * 回调由 XMLHttpRequestInstrumentation 直接传入它创建的 span，不依赖
 * Axios 响应拦截器执行时的 active context。
 */
export const applyXhrApiAttributes = (
  span: Span,
  xhr: XMLHttpRequest,
  apiOrigins: ReadonlySet<string>
): void => {
  try {
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
    // 遥测属性补充失败不得影响原始请求。
  }
};
