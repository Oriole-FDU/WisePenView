/**
 * 可观测性安装与应用生命周期。
 *
 * 负责组装 SDK、事件管线和浏览器监听器，开始、停止都必须保持 best-effort，
 * 不得阻断应用启动、认证切换或页面导航。
 */
import type { RouterState } from 'react-router-dom';

import { publicAppConfig } from '@/config/runtimeConfig';
import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';

import { captureException } from './capture';
import {
  createInitialContextAttributes,
  getRouteAttributes,
  ObservabilityContext,
  readEnvironment,
  setActiveContext,
} from './context';
import { startOtel } from './otel';
import { flushObservabilityEvents, startPipeline } from './pipeline';

export interface ObservabilityRouter {
  state: RouterState;
  subscribe: (listener: (state: RouterState) => void) => () => void;
}

export interface InstallObservabilityOptions {
  router: ObservabilityRouter;
}

const isObservabilityEnabled =
  Boolean(publicAppConfig.observability.otelEndpoint) && publicAppConfig.mode !== 'mock';

let activeStop: (() => void) | undefined;

const installRouteObservation = (
  router: ObservabilityRouter,
  context: ObservabilityContext
): (() => void) => {
  let previousKey = '';
  const update = (state: RouterState): void => {
    const route = getRouteAttributes(state);
    context.setRoute(route);
    const locationKey = state.location?.key ?? '';
    if (locationKey === previousKey) return;
    previousKey = locationKey;
    context.addBreadcrumb('page.navigation', route);
  };
  update(router.state);
  return router.subscribe(update);
};

const installGlobalExceptionCapture = (): (() => void) => {
  const onError = (event: ErrorEvent): void => {
    captureException(event.error ?? event.message, {
      detector: 'window-error',
      location: event.filename?.trim()
        ? {
            filename: event.filename,
            line: event.lineno,
            column: event.colno,
          }
        : undefined,
    });
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    captureException(event.reason, { detector: 'window-unhandled-rejection' });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
};

export const installObservability = ({ router }: InstallObservabilityOptions): (() => void) => {
  if (!isObservabilityEnabled || activeStop) return () => undefined;

  try {
    const authVersion = authSessionCoordinator.getSessionVersion();
    const context = new ObservabilityContext(
      createInitialContextAttributes(publicAppConfig.mode),
      authVersion
    );
    context.setEnvironment(readEnvironment());
    const otel = startOtel({ resourceAttributes: context.getResourceAttributes() });
    if (!otel) return () => undefined;

    const stopPipeline = startPipeline(context, otel.tracer, otel.logger);
    setActiveContext(context);
    const cleanups: (() => void)[] = [];
    let stopped = false;
    let timer: number | undefined;

    const updateEnvironment = (breadcrumb: string): void => {
      const environment = readEnvironment();
      context.setEnvironment(environment);
      context.addBreadcrumb(breadcrumb, environment);
    };
    const onVisibility = (): void => {
      updateEnvironment('page.visibility_changed');
      if (document.visibilityState === 'hidden') flushObservabilityEvents(true);
    };
    const onNetwork = (): void => updateEnvironment('network.changed');
    const onPageHide = (): void => flushObservabilityEvents(true);

    const stop = (): void => {
      if (stopped) return;
      stopped = true;
      for (const cleanup of cleanups.reverse()) cleanup();
      if (timer !== undefined) window.clearInterval(timer);
      stopPipeline();
      setActiveContext(undefined);
      void otel.shutdown().catch(() => undefined);
      if (activeStop === stop) activeStop = undefined;
    };

    try {
      cleanups.push(installRouteObservation(router, context));
      cleanups.push(
        authSessionCoordinator.subscribe(() => {
          try {
            flushObservabilityEvents(true);
            context.resetIdentity(authSessionCoordinator.getSessionVersion());
          } catch {
            // 身份切换的遥测处理不得阻断认证监听。
          }
        })
      );
      cleanups.push(installGlobalExceptionCapture());
      document.addEventListener('visibilitychange', onVisibility);
      cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));
      window.addEventListener('online', onNetwork);
      cleanups.push(() => window.removeEventListener('online', onNetwork));
      window.addEventListener('offline', onNetwork);
      cleanups.push(() => window.removeEventListener('offline', onNetwork));
      window.addEventListener('pagehide', onPageHide);
      cleanups.push(() => window.removeEventListener('pagehide', onPageHide));
      timer = window.setInterval(() => flushObservabilityEvents(), 10_000);
      cleanups.push(() => window.clearInterval(timer));
      activeStop = stop;
      return stop;
    } catch {
      stop();
      return () => undefined;
    }
  } catch {
    setActiveContext(undefined);
    return () => undefined;
  }
};
