import {
  type Attributes,
  type Context,
  context,
  type Span,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';
import axios, {
  type AxiosAdapter,
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

import { parseApiErrorBody } from '@/apis/apiError';
import { getErrorReportId } from '@/utils/error/reportError';
import { isWisePenError } from '@/utils/error/WisePenError';

import { TELEMETRY_OWNER_CONTEXT_KEY } from './_internal/context';
import { tracer } from './_internal/otel';
import {
  captureTelemetryContext,
  recordBreadcrumb,
  recordTelemetryEvent,
} from './_internal/runtime';
import { readRequestPath } from './_internal/sanitize';

const requestsByError = new WeakMap<object, RequestTelemetry>();

/** 使用实例保持引用，避免 Axios 重试合并配置时复制身份和去重状态。 */
export class RequestTelemetry {
  readonly snapshot = captureTelemetryContext();
  readonly startedAt = Date.now();
  readonly attributes: Attributes;
  reported = false;
  readonly context: Context;
  private readonly span?: Span;
  private adapter?: AxiosAdapter;
  private finished = false;

  constructor(url: string, method: string, config?: AxiosRequestConfig) {
    const path = readRequestPath(url, config?.baseURL);
    this.attributes = {
      'http.request.method': method.toUpperCase(),
      'api.endpoint': path,
      'url.path': path,
      'operation.name': `${method.toUpperCase()} ${path}`,
    };
    const parent = this.snapshot
      ? context.active().setValue(TELEMETRY_OWNER_CONTEXT_KEY, this.snapshot)
      : context.active();
    this.span = this.snapshot
      ? tracer.startSpan(
          `api.request ${method.toUpperCase()} ${path}`,
          {
            attributes: { ...this.snapshot.attributes, ...this.attributes },
          },
          parent
        )
      : undefined;
    this.context = this.span ? trace.setSpan(parent, this.span) : parent;
  }

  /** 在传输层显式恢复现场，避免地址探测和原生 async/await 丢失父 span。 */
  bindAdapter(config: AxiosRequestConfig): void {
    if (!this.span || config.adapter === this.adapter) return;
    const adapter = axios.getAdapter(config.adapter);
    this.adapter = (current) => context.with(this.context, () => adapter(current));
    config.adapter = this.adapter;
  }

  markFailure(kind: string, severity: string): void {
    if (severity !== 'ERROR') return;
    const message = `Request failed: ${kind}`;
    this.span?.setStatus({ code: SpanStatusCode.ERROR, message });
    this.span?.recordException({ name: kind, message });
  }

  /** 一次逻辑请求覆盖地址等待、全部重试与响应解包，且只结束一次。 */
  finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.span?.setAttributes({
      ...this.attributes,
      'request.duration_ms': Date.now() - this.startedAt,
    });
    this.span?.end();
  }
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 内部请求现场，跨重试复用；禁止放入请求头或请求正文。 */
    __wisePenTelemetry?: RequestTelemetry;
  }
}

/** 每次传输前恢复请求上下文，并记录地址选择后的真实 API 来源。 */
export const prepareRequestTelemetry = (config: AxiosRequestConfig): void => {
  const request = config.__wisePenTelemetry;
  if (!request) return;
  request.bindAdapter(config);
  if (!config.baseURL) return;
  try {
    const url = new URL(config.url ?? '/', config.baseURL);
    request.attributes['server.address'] = url.hostname;
    if (url.port) request.attributes['server.port'] = Number(url.port);
  } catch {
    // URL 配置校验由请求层负责，遥测不改变请求结果。
  }
};

export const captureResponseTelemetry = (response: AxiosResponse): void => {
  const request = response.config.__wisePenTelemetry;
  if (!request) return;
  request.attributes['http.response.status_code'] = response.status;
  const requestId: unknown = response.headers['x-request-id'];
  if (typeof requestId === 'string' && /^[\w.:-]{1,128}$/.test(requestId)) {
    request.attributes['wisepen.request_id'] = requestId;
  }
};

export const recordRequestSuccess = (request: RequestTelemetry): void => {
  request.attributes['api.outcome'] = 'success';
  recordBreadcrumb(
    'http.request',
    {
      ...request.attributes,
      'request.duration_ms': Date.now() - request.startedAt,
    },
    request.snapshot
  );
};

export const getRequestError = (error: unknown): RequestTelemetry | undefined =>
  typeof error === 'object' && error !== null ? requestsByError.get(error) : undefined;

const reportFailure = (
  error: unknown,
  request: RequestTelemetry,
  kind: string,
  severity: 'INFO' | 'WARN' | 'ERROR',
  canceled = false
): void => {
  if (typeof error === 'object' && error !== null) requestsByError.set(error, request);
  if (request.reported) return;
  request.reported = true;
  const attributes: Attributes = {
    ...request.attributes,
    'api.outcome': canceled ? 'canceled' : 'failure',
    'error.kind': kind,
    'request.duration_ms': Date.now() - request.startedAt,
  };
  Object.assign(request.attributes, attributes);
  recordBreadcrumb('http.request', attributes, request.snapshot);
  if (canceled) return;
  request.markFailure(kind, severity);
  recordTelemetryEvent(
    'frontend.request_failure',
    severity,
    `Request failed: ${kind}`,
    {
      ...attributes,
      'error.id': getErrorReportId(error),
      'error.type':
        kind === 'http' ? `HTTP_${request.attributes['http.response.status_code']}` : kind,
      'error.source': isWisePenError(error) ? error.source : kind,
      'error.code': isWisePenError(error) ? error.code : undefined,
      'error.fingerprint': `${kind}:${attributes['http.request.method']}:${attributes['api.endpoint']}:${attributes['http.response.status_code'] ?? ''}:${attributes['api.business_code'] ?? ''}`,
    },
    { owner: request.snapshot, context: request.context, aggregate: true }
  );
};

/** 最终失败才上报；业务层包装后的异常绑定同一现场，避免全局监听重复记录。 */
export const reportHttpFailure = (error: AxiosError, mappedError: unknown = error): void => {
  const request = error.config?.__wisePenTelemetry;
  if (!request) return;
  if (error.response) {
    captureResponseTelemetry(error.response);
    const body = parseApiErrorBody(error.response.data);
    if (body?.code !== undefined) request.attributes['api.business_code'] = body.code;
  }
  request.attributes['http.request.resend_count'] =
    (error.config as { __wisePenRetryCount?: number } | undefined)?.__wisePenRetryCount ?? 0;
  const status = error.response?.status;
  const canceled = error.code === 'ERR_CANCELED';
  const kind = canceled
    ? 'canceled'
    : error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      ? 'timeout'
      : status === undefined
        ? 'network'
        : 'http';
  const severity =
    status === 401 || status === 400 || status === 422
      ? 'INFO'
      : status !== undefined && status < 500
        ? 'WARN'
        : 'ERROR';
  reportFailure(mappedError, request, kind, severity, canceled);
};

/** HTTP 200 的业务失败和响应契约错误由解包层补齐，保留原始异常给业务处理。 */
export const reportApiFailure = (error: unknown, request: RequestTelemetry): void => {
  if (isWisePenError(error) && error.source === 'api') {
    request.attributes['api.business_code'] = error.code;
    reportFailure(error, request, 'business', 'WARN');
  } else if (!request.reported) {
    reportFailure(error, request, 'contract', 'ERROR');
  }
};
