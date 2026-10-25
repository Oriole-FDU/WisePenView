import { type Attributes, createContextKey } from '@opentelemetry/api';

import type { Breadcrumb, TelemetrySnapshot } from './model';

export const TELEMETRY_OWNER_CONTEXT_KEY = createContextKey('wisepen.telemetry.owner');

const MAX_BREADCRUMBS = 50;
const BREADCRUMB_TTL_MS = 120_000;
const BREADCRUMB_FIELDS = new Set([
  'page.route',
  'resource.id',
  'editor.type',
  'page.visibility',
  'network.online',
  'operation.name',
  'http.request.method',
  'http.response.status_code',
  'http.request.resend_count',
  'api.endpoint',
  'api.outcome',
  'api.business_code',
  'error.kind',
  'request.duration_ms',
]);

interface ContextOptions {
  attributes: Attributes;
  sessionId: string;
  authVersion: number;
  now: () => number;
  createId: () => string;
}

/** 持有当前身份与有限的近期事件；请求快照在账号切换后仍保持原归属。 */
export class TelemetryContext {
  private readonly options: ContextOptions;
  private sessionId: string;
  private authVersion: number;
  private userId?: string;
  private page: Attributes = {};
  private environment: Attributes = {};
  private breadcrumbs: Breadcrumb[] = [];
  private droppedBreadcrumbs = 0;

  constructor(options: ContextOptions) {
    this.options = options;
    this.sessionId = options.sessionId;
    this.authVersion = options.authVersion;
  }

  identify(userId: string, authVersion: number): boolean {
    if (!userId || authVersion !== this.authVersion || userId === this.userId) return false;
    this.userId = userId.slice(0, 128);
    return true;
  }

  resetIdentity(authVersion: number): string {
    this.authVersion = authVersion;
    this.userId = undefined;
    this.sessionId = this.options.createId();
    this.breadcrumbs = [];
    this.droppedBreadcrumbs = 0;
    return this.sessionId;
  }

  setPage(page: Attributes): void {
    this.page = { ...page };
  }

  setEnvironment(environment: Attributes): void {
    this.environment = { ...environment };
  }

  addBreadcrumb(name: string, attributes: Attributes = {}, owner?: TelemetrySnapshot): void {
    if (owner && owner.authVersion !== this.authVersion) return;
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
      this.droppedBreadcrumbs++;
    }
  }

  capture(): TelemetrySnapshot {
    this.pruneBreadcrumbs();
    return {
      authVersion: this.authVersion,
      attributes: {
        ...this.options.attributes,
        ...this.page,
        ...this.environment,
        'session.id': this.sessionId,
        'user.id': this.userId,
        'telemetry.breadcrumbs_dropped': this.droppedBreadcrumbs,
      },
      breadcrumbs: [...this.breadcrumbs],
    };
  }

  getBreadcrumbs(owner: TelemetrySnapshot): readonly Breadcrumb[] {
    this.pruneBreadcrumbs();
    return owner.authVersion === this.authVersion ? [...this.breadcrumbs] : owner.breadcrumbs;
  }

  private pruneBreadcrumbs(): void {
    const threshold = this.options.now() - BREADCRUMB_TTL_MS;
    this.breadcrumbs = this.breadcrumbs.filter(({ at }) => at >= threshold);
  }
}
