/**
 * 逻辑请求 span 与最终失败分类。
 *
 * 一次逻辑请求覆盖地址等待、全部重试、响应解包和解析；所有观测失败均静默，
 * 不替换 Axios 映射后的业务异常，也不改变认证、重试或返回结果。
 */
import {
  type Attributes,
  type Context,
  context as otelContext,
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
import { FRONTEND_NETWORK_ERROR } from '@/utils/error/codes';
import { isWisePenError } from '@/utils/error/WisePenError';

import { getSupportErrorId, markExceptionObserved } from './capture';
import { emitRequestEvent, getRequestTracingHandles, recordRequestBreadcrumb } from './pipeline';
import {
  isValidRequestId,
  normalizeApiEndpoint,
  sanitizeDiagnosticText,
  sanitizePath,
} from './privacy';
import type { ContextSnapshot, ObservationSeverity } from './types';

type RequestFailureKind = 'http' | 'network' | 'timeout' | 'business' | 'contract' | 'unknown';

const compactAttributes = (attributes: Attributes): Attributes =>
  Object.fromEntries(Object.entries(attributes).filter(([, value]) => value !== undefined));

interface RequestFailureClassification {
  kind: RequestFailureKind | 'canceled';
  severity?: ObservationSeverity;
  status?: number;
  businessCode?: number;
  serverMessage?: string;
}

const isCanceled = (error: unknown, cause: AxiosError | undefined): boolean =>
  (isWisePenError(error) &&
    error.source === 'network' &&
    error.code === FRONTEND_NETWORK_ERROR.CANCELED) ||
  cause?.code === 'ERR_CANCELED';

const getAxiosCause = (error: unknown): AxiosError | undefined => {
  if (axios.isAxiosError(error)) return error;
  if (isWisePenError(error) && axios.isAxiosError(error.cause)) return error.cause;
  return undefined;
};

const getRequestPath = (url: string, baseURL?: string): string => {
  try {
    const base =
      baseURL ??
      (typeof window === 'undefined' ? 'https://observability.invalid' : window.location.origin);
    return normalizeApiEndpoint(new URL(url, base).pathname);
  } catch {
    return normalizeApiEndpoint(sanitizePath(url));
  }
};

const classifyFailure = (
  error: unknown,
  cause: AxiosError | undefined
): RequestFailureClassification => {
  if (isCanceled(error, cause)) return { kind: 'canceled' };

  const status = cause?.response?.status;
  if (status !== undefined && status >= 400) {
    return {
      kind: 'http',
      status,
      severity:
        status === 400 || status === 401 || status === 422
          ? 'INFO'
          : status < 500
            ? 'WARN'
            : 'ERROR',
    };
  }

  if (isWisePenError(error) && error.source === 'api') {
    return {
      kind: 'business',
      status,
      severity: 'WARN',
      businessCode: error.code,
      serverMessage: error.serverMsg,
    };
  }

  if (
    isWisePenError(error) &&
    error.source === 'http' &&
    error.code === FRONTEND_NETWORK_ERROR.INVALID_RESPONSE
  ) {
    return { kind: 'contract', severity: 'ERROR' };
  }

  if (
    cause?.code === 'ECONNABORTED' ||
    cause?.code === 'ETIMEDOUT' ||
    cause?.message.toLowerCase().includes('timeout')
  ) {
    return { kind: 'timeout', severity: 'ERROR' };
  }
  if (cause && !cause.response) return { kind: 'network', severity: 'ERROR' };
  return { kind: 'unknown', severity: 'ERROR' };
};

export class RequestObservation {
  readonly attributes: Attributes;
  readonly context: Context;
  readonly snapshot: ContextSnapshot;
  readonly startedAt = Date.now();
  private readonly span: Span;
  private readonly sessionId: unknown;
  private adapter?: AxiosAdapter;
  private finished = false;
  private reported = false;

  constructor(
    snapshot: ContextSnapshot,
    parentContext: Context,
    span: Span,
    url: string,
    method: string,
    baseURL?: string
  ) {
    const path = getRequestPath(url, baseURL);
    this.snapshot = snapshot;
    this.sessionId = snapshot.attributes['session.id'];
    this.span = span;
    this.context = trace.setSpan(parentContext, span);
    this.attributes = {
      'operation.name': 'http.request',
      'http.request.method': method.toUpperCase(),
      'api.endpoint': path,
      'url.path': path,
    };
    this.span.setAttributes(compactAttributes({ ...snapshot.attributes, ...this.attributes }));
  }

  bindAdapter(config: AxiosRequestConfig): void {
    try {
      if (config.adapter === this.adapter) return;
      const adapter = axios.getAdapter(config.adapter);
      this.adapter = (current) => otelContext.with(this.context, () => adapter(current));
      config.adapter = this.adapter;
    } catch {
      // 自动网络 span 的父子关系失败不得影响请求。
    }
  }

  captureResponse(response: AxiosResponse): void {
    try {
      this.attributes['http.response.status_code'] = response.status;
      const requestId: unknown = response.headers['x-request-id'];
      if (typeof requestId === 'string' && isValidRequestId(requestId)) {
        this.attributes['wisepen.request_id'] = requestId;
      }
      const businessCode = parseApiErrorBody(response.data)?.code;
      if (businessCode !== undefined) this.attributes['api.business_code'] = businessCode;
    } catch {
      // 响应现场补充失败不得影响响应解包。
    }
  }

  recordSuccess(): void {
    try {
      this.attributes['api.outcome'] = 'success';
      this.attributes['request.duration_ms'] = Date.now() - this.startedAt;
      this.span.setAttributes(compactAttributes(this.attributes));
      recordRequestBreadcrumb('http.request', this.attributes, this.sessionId);
    } catch {
      // 成功 breadcrumb 失败不得影响请求。
    }
  }

  reportFailure(error: unknown): boolean {
    if (this.reported) return false;
    this.reported = true;

    try {
      const cause = getAxiosCause(error);
      const classification = classifyFailure(error, cause);
      this.attributes['api.outcome'] = classification.kind === 'canceled' ? 'canceled' : 'failure';
      this.attributes['request.duration_ms'] = Date.now() - this.startedAt;
      this.attributes['http.request.resend_count'] =
        (cause?.config as { __wisePenRetryCount?: number } | undefined)?.__wisePenRetryCount ?? 0;
      recordRequestBreadcrumb('http.request', this.attributes, this.sessionId);
      if (classification.kind === 'canceled') return false;

      const severity = classification.severity ?? 'ERROR';
      const businessCode =
        classification.businessCode ??
        parseApiErrorBody(cause?.response?.data)?.code ??
        (isWisePenError(error) ? error.code : undefined);
      const serverMessage = sanitizeDiagnosticText(
        classification.serverMessage ?? (isWisePenError(error) ? (error.serverMsg ?? '') : ''),
        512
      );
      const message = `Request failed: ${classification.kind}`;
      const stack = isWisePenError(error)
        ? sanitizeDiagnosticText(error.stack?.split('\n').slice(2).join('\n') ?? '', 32_000)
        : undefined;
      const requestAttributes = compactAttributes({
        ...this.snapshot.attributes,
        ...this.attributes,
        'error.id': getSupportErrorId(error),
        'error.kind': classification.kind,
        'error.type':
          classification.kind === 'http' && classification.status !== undefined
            ? `HTTP_${classification.status}`
            : classification.kind,
        'error.fingerprint': `${classification.kind}:${
          this.attributes['http.request.method']
        }:${this.attributes['api.endpoint']}:${classification.status ?? ''}:${businessCode ?? ''}`,
        'error.source': isWisePenError(error) ? error.source : classification.kind,
      });
      if (classification.kind === 'http') {
        requestAttributes['error.fingerprint'] = `${classification.kind}:${
          requestAttributes['http.request.method']
        }:${requestAttributes['api.endpoint']}:${classification.status ?? ''}:${
          businessCode ?? ''
        }`;
      }
      if (isWisePenError(error)) requestAttributes['error.code'] = error.code;
      if (businessCode !== undefined) requestAttributes['api.business_code'] = businessCode;
      if (serverMessage) requestAttributes['api.server_message'] = serverMessage;

      this.span.setAttributes(requestAttributes);
      if (severity === 'ERROR') {
        this.span.setStatus({ code: SpanStatusCode.ERROR, message });
      }
      const emitted = emitRequestEvent({
        name: 'frontend.request_failure',
        severity,
        message,
        timestamp: Date.now(),
        attributes: requestAttributes,
        context: this.context,
        exception: {
          type: isWisePenError(error) ? error.name : 'Error',
          message,
          stack,
        },
      });
      markExceptionObserved(error);
      return emitted;
    } catch {
      // 请求观测失败必须保持静默，原异常继续由调用方处理。
      return false;
    }
  }

  finish(): void {
    if (this.finished) return;
    this.finished = true;
    try {
      this.span.setAttribute('request.duration_ms', Date.now() - this.startedAt);
      this.span.end();
    } catch {
      // span 结束失败不得影响请求结果。
    }
  }
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 内部逻辑请求观测现场；跨重试复用，不进入请求头或正文。 */
    __wisePenRequestObservation?: RequestObservation;
  }
}

export const startRequestObservation = (
  url: string,
  method: string,
  config?: AxiosRequestConfig
): RequestObservation | undefined => {
  try {
    const handles = getRequestTracingHandles();
    if (!handles) return undefined;
    const path = getRequestPath(url, config?.baseURL);
    const span = handles.tracer.startSpan(
      `api.request ${method.toUpperCase()} ${path}`,
      {
        attributes: {
          ...handles.snapshot.attributes,
          'operation.name': 'http.request',
          'http.request.method': method.toUpperCase(),
          'api.endpoint': path,
          'url.path': path,
        },
      },
      handles.context
    );
    return new RequestObservation(
      handles.snapshot,
      handles.context,
      span,
      url,
      method,
      config?.baseURL
    );
  } catch {
    return undefined;
  }
};

export const prepareRequestObservation = (config: AxiosRequestConfig): void => {
  try {
    const observation = config.__wisePenRequestObservation;
    if (!observation) return;
    observation.bindAdapter(config);
    if (!config.baseURL) return;
    const url = new URL(config.url ?? '/', config.baseURL);
    observation.attributes['server.address'] = url.hostname;
    if (url.port) observation.attributes['server.port'] = Number(url.port);
  } catch {
    // URL 配置由请求层负责，观测失败不改变请求。
  }
};

export const captureRequestResponse = (response: AxiosResponse): void => {
  response.config.__wisePenRequestObservation?.captureResponse(response);
};

export const captureRequestErrorResponse = (error: AxiosError): void => {
  try {
    const observation = error.config?.__wisePenRequestObservation;
    if (!observation || !error.response) return;
    observation.captureResponse(error.response);
  } catch {
    // 失败响应现场补充失败不得影响原错误。
  }
};
