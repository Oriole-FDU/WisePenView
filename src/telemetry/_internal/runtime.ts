import { type Attributes, type Context, context } from '@opentelemetry/api';

import { publicAppConfig } from '@/config/runtimeConfig';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';
import { getDesktopOs, isDesktop } from '@/utils/platform';
import { createUuid } from '@/utils/random/createUuid';

import { TelemetryContext } from './context';
import { ErrorAggregation } from './errorAggregation';
import type { TelemetryEvent, TelemetrySink, TelemetrySnapshot } from './model';

export const isTelemetryEnabled =
  Boolean(publicAppConfig.observability.otelEndpoint) && publicAppConfig.mode !== 'mock';

const TELEMETRY_ID_PATTERN = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const CLIENT_ID_TTL_MS = 90 * 24 * 60 * 60_000;
let state: TelemetryContext | undefined;
let aggregation: ErrorAggregation | undefined;
let currentAuthVersion = authSessionCoordinator.getSessionVersion();
let clientAttributes: Attributes | undefined;

const persistSessionId = (id: string): void => {
  try {
    sessionStorage.setItem(STORAGE_KEYS.telemetrySession, id);
  } catch {
    // 存储受限时仅在当前页面内维持会话，不影响业务。
  }
};

const readSessionId = (): string => {
  try {
    const value = sessionStorage.getItem(STORAGE_KEYS.telemetrySession);
    if (value && TELEMETRY_ID_PATTERN.test(value)) return value;
  } catch {
    // 读取失败时生成当前页面会话。
  }
  const id = createUuid();
  persistSessionId(id);
  return id;
};

const readClientId = (): string => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.telemetryClient);
    if (raw) {
      const stored: unknown = JSON.parse(raw);
      if (
        typeof stored === 'object' &&
        stored !== null &&
        'id' in stored &&
        typeof stored.id === 'string' &&
        TELEMETRY_ID_PATTERN.test(stored.id) &&
        'expiresAt' in stored &&
        typeof stored.expiresAt === 'number' &&
        stored.expiresAt > Date.now()
      )
        return stored.id;
    }
  } catch {
    // 不可用或过期的标识由新的匿名标识替代。
  }
  const id = createUuid();
  try {
    localStorage.setItem(
      STORAGE_KEYS.telemetryClient,
      JSON.stringify({ id, expiresAt: Date.now() + CLIENT_ID_TTL_MS })
    );
  } catch {
    // 匿名标识持久化失败时保留内存值。
  }
  return id;
};

/** 这里只收集客户端类别与版本，不上传原始 User-Agent 或硬件指纹。 */
export const getClientAttributes = (): Attributes => {
  if (clientAttributes) return clientAttributes;
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const browser =
    /Edg\/([\d.]+)/.exec(ua) ??
    /Firefox\/([\d.]+)/.exec(ua) ??
    /Chrome\/([\d.]+)/.exec(ua) ??
    /Version\/([\d.]+)/.exec(ua);
  const name = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'unknown';
  clientAttributes = {
    'service.version': __APP_VERSION__,
    'deployment.environment.name': publicAppConfig.mode,
    'client.id': readClientId(),
    'client.type': isDesktop() ? 'electron' : 'web',
    'browser.name': name,
    'browser.version': browser?.[1],
    'os.type': getDesktopOs(),
    'page.instance.id': createUuid(),
  };
  return clientAttributes;
};

const getState = (): TelemetryContext | undefined => {
  if (!isTelemetryEnabled) return undefined;
  state ??= new TelemetryContext({
    attributes: getClientAttributes(),
    sessionId: readSessionId(),
    authVersion: currentAuthVersion,
    now: Date.now,
    createId: createUuid,
  });
  const version = authSessionCoordinator.getSessionVersion();
  if (version !== currentAuthVersion) resetTelemetryIdentity('changed');
  state.setEnvironment({
    'page.visibility': document.visibilityState,
    'network.online': navigator.onLine,
  });
  return state;
};

export const captureTelemetryContext = (): TelemetrySnapshot | undefined => getState()?.capture();

export const recordBreadcrumb = (
  name: string,
  attributes: Attributes = {},
  owner?: TelemetrySnapshot
): void => {
  getState()?.addBreadcrumb(name, attributes, owner);
};

export const setTelemetryPage = (page: Attributes): void => {
  getState()?.setPage(page);
};

export const identifyTelemetryUser = (userId: string, authVersion: number): void => {
  if (getState()?.identify(userId, authVersion)) {
    recordTelemetryEvent('session.identified', 'INFO', 'Authenticated session identified');
  }
};

export const resetTelemetryIdentity = (reason: string): void => {
  const version = authSessionCoordinator.getSessionVersion();
  if (version === currentAuthVersion) return;
  aggregation?.flush(true);
  currentAuthVersion = version;
  if (!state) return;
  // 先结束旧会话再清空现场，旧请求保留自己捕获的身份快照。
  const previous = state.capture();
  recordTelemetryEvent('session.ended', 'INFO', reason, {}, { owner: previous });
  persistSessionId(state.resetIdentity(version));
  recordTelemetryEvent('session.started', 'INFO', reason, {}, { owner: state.capture() });
};

export const installTelemetrySink = (sink: TelemetrySink): (() => void) => {
  const current = new ErrorAggregation(sink);
  aggregation = current;
  return () => {
    current.flush(true);
    if (aggregation === current) aggregation = undefined;
  };
};

export const flushTelemetryEvents = (force = false): void => aggregation?.flush(force);

interface EventOptions {
  owner?: TelemetrySnapshot;
  context?: Context;
  aggregate?: boolean;
}

export const recordTelemetryEvent = (
  name: string,
  severity: TelemetryEvent['severity'],
  message: string,
  attributes: Attributes = {},
  options: EventOptions = {}
): void => {
  const owner = options.owner ?? captureTelemetryContext();
  if (!owner || !aggregation) return;
  const event: TelemetryEvent = {
    name,
    severity,
    message,
    timestamp: Date.now(),
    context: options.context ?? context.active(),
    attributes: {
      ...owner.attributes,
      'page.visibility': document.visibilityState,
      'network.online': navigator.onLine,
      ...attributes,
      'event.name': name,
      'telemetry.breadcrumbs': JSON.stringify(state?.getBreadcrumbs(owner) ?? owner.breadcrumbs),
    },
  };
  if (options.aggregate) aggregation.record(event);
  else aggregation.emit(event);
};
