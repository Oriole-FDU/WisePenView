import type { Attributes } from '@opentelemetry/api';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { getDesktopOs, isDesktop } from '@/utils/platform';
import { createUuid } from '@/utils/random/createUuid';

import type { Breadcrumb, ContextSnapshot } from './model';

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

interface ContextOptions {
  attributes: Attributes;
  sessionId: string;
  authVersion: number;
  now: () => number;
  createId: () => string;
}

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
    // 存储受限时仅保留当前页面内标识，不影响业务。
  }
};

const readSessionId = (createId: () => string): string => {
  const stored = readStorageValue(
    typeof sessionStorage === 'undefined' ? undefined : sessionStorage,
    STORAGE_KEYS.telemetrySession
  );
  if (stored && TELEMETRY_ID_PATTERN.test(stored)) return stored;

  const value = createId();
  writeStorageValue(
    typeof sessionStorage === 'undefined' ? undefined : sessionStorage,
    STORAGE_KEYS.telemetrySession,
    value
  );
  return value;
};

const readClientId = (createId: () => string, now: () => number): string => {
  const storage = typeof localStorage === 'undefined' ? undefined : localStorage;
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
    'service.version': __APP_VERSION__,
    'deployment.environment.name': mode,
    'client.id': readClientId(createId, now),
    'client.type': isDesktop() ? 'electron' : 'web',
    'browser.name': browser.name,
    'browser.version': browser.version,
    'os.type': getDesktopOs(),
    'page.instance.id': createId(),
  };
};

/** 保存当前页面身份与有限的近期上下文；账号切换后旧快照保持独立。 */
export class ObservabilityContext {
  private readonly options: ContextOptions;
  private sessionId: string;
  private authVersion: number;
  private userId?: string;
  private route: Attributes = {};
  private environment: Attributes = {};
  private breadcrumbs: Breadcrumb[] = [];
  private droppedBreadcrumbs = 0;

  constructor(options: ContextOptions) {
    this.options = options;
    this.sessionId = options.sessionId;
    this.authVersion = options.authVersion;
  }

  static create(attributes: Attributes, authVersion: number): ObservabilityContext {
    return new ObservabilityContext({
      attributes,
      authVersion,
      sessionId: readSessionId(createUuid),
      now: Date.now,
      createId: createUuid,
    });
  }

  identify(userId: string, authVersion: number): boolean {
    if (!userId || authVersion !== this.authVersion || userId === this.userId) return false;
    this.userId = userId.slice(0, 128);
    return true;
  }

  resetIdentity(authVersion: number): void {
    this.authVersion = authVersion;
    this.userId = undefined;
    this.sessionId = this.options.createId();
    this.breadcrumbs = [];
    this.droppedBreadcrumbs = 0;
    writeStorageValue(
      typeof sessionStorage === 'undefined' ? undefined : sessionStorage,
      STORAGE_KEYS.telemetrySession,
      this.sessionId
    );
  }

  setRoute(route: Attributes): void {
    this.route = { ...route };
  }

  setEnvironment(environment: Attributes): void {
    this.environment = { ...environment };
  }

  getResourceAttributes(): Attributes {
    return { ...this.options.attributes };
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
      at: this.options.now(),
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
        ...this.options.attributes,
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
    const threshold = this.options.now() - BREADCRUMB_TTL_MS;
    this.breadcrumbs = this.breadcrumbs.filter(({ at }) => at >= threshold);
  }
}
