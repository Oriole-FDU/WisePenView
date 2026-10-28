/**
 * 遥测上下文与页面身份生命周期。
 *
 * 负责匿名标识、会话轮换、路由快照和近期事件，不负责异常导出。
 */
import type { Attributes } from '@opentelemetry/api';
import type { RouterState } from 'react-router-dom';

import { buildTelemetryAttributes } from '@/config/buildInfo';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';
import { getDesktopOs, isDesktop } from '@/utils/platform';
import { createUuid } from '@/utils/random/createUuid';

import type { Breadcrumb, ContextSnapshot } from './types';

const CLIENT_ID_TTL_MS = 90 * 24 * 60 * 60_000;
const MAX_BREADCRUMBS = 50;
const BREADCRUMB_TTL_MS = 120_000;
const TELEMETRY_ID_PATTERN = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const BREADCRUMB_FIELDS = new Set([
  'page.route',
  'resource.id',
  'editor.type',
  'page.visibility',
  'network.online',
]);

let activeContext: ObservabilityContext | undefined;

const getStorage = (kind: 'localStorage' | 'sessionStorage'): Storage | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window[kind];
  } catch {
    return undefined;
  }
};

const readStorageValue = (storage: Storage | undefined, key: string): string | null => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const writeStorageValue = (storage: Storage | undefined, key: string, value: string): void => {
  try {
    storage?.setItem(key, value);
  } catch {
    // 存储受限时仅保留当前页面内标识。
  }
};

const readSessionId = (createId: () => string): string => {
  const storage = getStorage('sessionStorage');
  const stored = readStorageValue(storage, STORAGE_KEYS.telemetrySession);
  if (stored && TELEMETRY_ID_PATTERN.test(stored)) return stored;
  const value = createId();
  writeStorageValue(storage, STORAGE_KEYS.telemetrySession, value);
  return value;
};

const readClientId = (createId: () => string, now: () => number): string => {
  const storage = getStorage('localStorage');
  const raw = readStorageValue(storage, STORAGE_KEYS.telemetryClient);
  if (raw) {
    try {
      const stored: unknown = JSON.parse(raw);
      if (
        typeof stored === 'object' &&
        stored !== null &&
        'id' in stored &&
        typeof stored.id === 'string' &&
        TELEMETRY_ID_PATTERN.test(stored.id) &&
        'expiresAt' in stored &&
        typeof stored.expiresAt === 'number' &&
        stored.expiresAt > now()
      ) {
        return stored.id;
      }
    } catch {
      // 无效标识由新的匿名 ID 替换。
    }
  }

  const id = createId();
  writeStorageValue(
    storage,
    STORAGE_KEYS.telemetryClient,
    JSON.stringify({ id, expiresAt: now() + CLIENT_ID_TTL_MS })
  );
  return id;
};

const readBrowser = (userAgent: string): { name: string; version?: string } => {
  const match =
    /Edg\/([\d.]+)/.exec(userAgent) ??
    /Firefox\/([\d.]+)/.exec(userAgent) ??
    /Chrome\/([\d.]+)/.exec(userAgent) ??
    /Version\/([\d.]+)/.exec(userAgent);
  const name = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Firefox\//.test(userAgent)
      ? 'Firefox'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'unknown';
  return { name, version: match?.[1] };
};

export const createInitialContextAttributes = (
  mode: string,
  now = Date.now,
  createId = createUuid
): Attributes => {
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const browser = readBrowser(userAgent);
  return {
    ...buildTelemetryAttributes,
    'deployment.environment.name': mode,
    'client.id': readClientId(createId, now),
    'client.type': isDesktop() ? 'electron' : 'web',
    'browser.name': browser.name,
    'browser.version': browser.version,
    'os.type': getDesktopOs(),
    'page.instance.id': createId(),
  };
};

export class ObservabilityContext {
  private readonly baseAttributes: Attributes;
  private sessionId: string;
  private authVersion: number;
  private userId?: string;
  private route: Attributes = {};
  private environment: Attributes = {};
  private breadcrumbs: Breadcrumb[] = [];
  private droppedBreadcrumbs = 0;
  private readonly now: () => number;
  private readonly createId: () => string;

  constructor(
    baseAttributes: Attributes,
    authVersion: number,
    sessionId = readSessionId(createUuid),
    now = Date.now,
    createId = createUuid
  ) {
    this.baseAttributes = baseAttributes;
    this.sessionId = sessionId;
    this.authVersion = authVersion;
    this.now = now;
    this.createId = createId;
  }

  identify(userId: string, authVersion: number): boolean {
    if (!userId || authVersion !== this.authVersion || userId === this.userId) return false;
    this.userId = userId.slice(0, 128);
    return true;
  }

  resetIdentity(authVersion: number): void {
    this.authVersion = authVersion;
    this.userId = undefined;
    this.sessionId = this.createId();
    this.breadcrumbs = [];
    this.droppedBreadcrumbs = 0;
    writeStorageValue(getStorage('sessionStorage'), STORAGE_KEYS.telemetrySession, this.sessionId);
  }

  setRoute(route: Attributes): void {
    this.route = { ...route };
  }

  setEnvironment(environment: Attributes): void {
    this.environment = { ...environment };
  }

  getResourceAttributes(): Attributes {
    return { ...this.baseAttributes };
  }

  addBreadcrumb(name: string, attributes: Attributes = {}): void {
    this.pruneBreadcrumbs();
    const safeAttributes: Attributes = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (!BREADCRUMB_FIELDS.has(key)) continue;
      if (typeof value === 'string') safeAttributes[key] = value.slice(0, 256);
      else if (typeof value === 'number' || typeof value === 'boolean') safeAttributes[key] = value;
    }
    this.breadcrumbs.push({
      at: this.now(),
      name: name.slice(0, 80),
      attributes: safeAttributes,
    });
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs.shift();
      this.droppedBreadcrumbs += 1;
    }
  }

  capture(): ContextSnapshot {
    this.pruneBreadcrumbs();
    return {
      attributes: {
        ...this.baseAttributes,
        ...this.route,
        ...this.environment,
        'session.id': this.sessionId,
        'user.id': this.userId,
      },
      breadcrumbs: [...this.breadcrumbs],
      breadcrumbsDropped: this.droppedBreadcrumbs,
    };
  }

  private pruneBreadcrumbs(): void {
    const threshold = this.now() - BREADCRUMB_TTL_MS;
    this.breadcrumbs = this.breadcrumbs.filter(({ at }) => at >= threshold);
  }
}

export const setActiveContext = (context: ObservabilityContext | undefined): void => {
  activeContext = context;
};

/** 复用守卫已有的用户查询，只把结果写入发起请求时的认证版本。 */
export async function observeUserLoad<T extends { id: string }>(
  load: () => Promise<T>
): Promise<T> {
  const authVersion = authSessionCoordinator.getSessionVersion();
  const user = await load();
  try {
    activeContext?.identify(user.id, authVersion);
  } catch {
    // 身份补充失败不能改变业务查询结果。
  }
  return user;
}

export const getRouteAttributes = (state: RouterState): Attributes => {
  let route = '';
  for (const match of state.matches) {
    const path = match.route.path;
    if (!path) continue;
    route = path.startsWith('/') ? path : `${route}/${path}`;
  }
  route = route.replace(/\/{2,}/g, '/') || '/';
  const params = state.matches.at(-1)?.params;
  return {
    'page.path': route,
    'page.route': route,
    'resource.id': params?.resourceId?.slice(0, 128),
    'editor.type': params?.resourceType?.slice(0, 32),
  };
};

export const readEnvironment = (): Attributes => ({
  'page.visibility':
    typeof document === 'undefined' ? 'unknown' : document.visibilityState || 'unknown',
  'network.online': typeof navigator === 'undefined' ? undefined : navigator.onLine,
});
