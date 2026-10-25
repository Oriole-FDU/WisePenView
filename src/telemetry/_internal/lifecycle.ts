import { context, type Span, trace } from '@opentelemetry/api';
import type { RouterState } from 'react-router-dom';

import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';

import { tracer } from './otel';
import {
  captureTelemetryContext,
  flushTelemetryEvents,
  identifyTelemetryUser,
  isTelemetryEnabled,
  recordBreadcrumb,
  recordTelemetryEvent,
  setTelemetryPage,
} from './runtime';

export interface TelemetryRouter {
  state: RouterState;
  subscribe: (listener: (state: RouterState) => void) => () => void;
}

/** 复用守卫已有的用户请求；异步结果仅能更新发起时的认证版本。 */
export async function loadTelemetryUser<T extends { id: string }>(
  load: () => Promise<T>
): Promise<T> {
  const version = authSessionCoordinator.getSessionVersion();
  const user = await load();
  identifyTelemetryUser(user.id, version);
  return user;
}

/** 页面路径使用路由模板，动态参数仅允许资源 ID 和编辑器类型进入现场。 */
export const getTelemetryPage = (state: RouterState) => {
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

/** 在应用入口安装一次，统一维护路由、前后台和网络事件及聚合窗口。 */
export const installAppTelemetry = (router: TelemetryRouter): (() => void) => {
  if (!isTelemetryEnabled) return () => undefined;
  let previousNavigation = '';
  let navigationSpan: Span | undefined;
  const onRoute = (state: RouterState): void => {
    const page = getTelemetryPage(state);
    setTelemetryPage(page);
    if (state.navigation.state !== 'idle') {
      navigationSpan ??= tracer.startSpan('page.navigation', {
        attributes: captureTelemetryContext()?.attributes,
      });
      return;
    }
    if (state.location.key === previousNavigation) {
      navigationSpan?.setAttribute('navigation.outcome', 'canceled');
      navigationSpan?.end();
      navigationSpan = undefined;
      return;
    }
    previousNavigation = state.location.key;
    const span =
      navigationSpan ??
      tracer.startSpan('page.navigation', {
        attributes: captureTelemetryContext()?.attributes,
      });
    navigationSpan = undefined;
    span.setAttributes({ ...page, 'navigation.outcome': 'completed' });
    try {
      recordBreadcrumb('page.navigation', page);
      recordTelemetryEvent(
        'page.navigation',
        'INFO',
        'Page navigation completed',
        {},
        {
          context: trace.setSpan(context.active(), span),
        }
      );
    } finally {
      span.end();
    }
  };
  const onVisibility = (): void => {
    recordBreadcrumb('page.visibility_changed', { 'page.visibility': document.visibilityState });
    if (document.visibilityState === 'hidden') flushTelemetryEvents(true);
  };
  const onNetwork = (): void => {
    recordBreadcrumb('network.changed', { 'network.online': navigator.onLine });
  };
  const onPageHide = (): void => flushTelemetryEvents(true);

  setTelemetryPage(getTelemetryPage(router.state));
  recordTelemetryEvent('session.started', 'INFO', 'Page session started');
  onRoute(router.state);
  const unsubscribe = router.subscribe(onRoute);
  const timer = window.setInterval(() => flushTelemetryEvents(), 10_000);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onNetwork);
  window.addEventListener('offline', onNetwork);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    unsubscribe();
    navigationSpan?.setAttribute('navigation.outcome', 'canceled');
    navigationSpan?.end();
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onNetwork);
    window.removeEventListener('offline', onNetwork);
    window.removeEventListener('pagehide', onPageHide);
    flushTelemetryEvents(true);
  };
};
