import type { Span } from '@opentelemetry/api';
import type { RouterState } from 'react-router-dom';

import { publicAppConfig } from '@/config/runtimeConfig';
import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';

import { ErrorAggregation } from './aggregation';
import { createInitialContextAttributes, ObservabilityContext } from './context';
import { createOtelEventSink } from './emitter';
import { installGlobalExceptionCapture } from './globalExceptionCapture';
import type { ObservabilityRouter } from './route';
import { getRouteAttributes } from './route';
import { flushObservabilityEvents, setActiveObservabilityRuntime } from './runtime';
import { startObservabilitySdk } from './sdk';

export interface InstallObservabilityOptions {
  router: ObservabilityRouter;
  applyXhrApiAttributes?: (span: Span, xhr: XMLHttpRequest) => void;
}

const isObservabilityEnabled =
  Boolean(publicAppConfig.observability.otelEndpoint) && publicAppConfig.mode !== 'mock';

let activeStop: (() => void) | undefined;

const readEnvironment = () => ({
  'page.visibility':
    typeof document === 'undefined' ? 'unknown' : document.visibilityState || 'unknown',
  'network.online': typeof navigator === 'undefined' ? undefined : navigator.onLine,
});

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

/** 安装唯一可观测性实例；关闭、初始化和清理均不影响业务启动。 */
export const installObservability = ({
  router,
  applyXhrApiAttributes,
}: InstallObservabilityOptions): (() => void) => {
  if (!isObservabilityEnabled) return () => undefined;
  if (activeStop) return () => undefined;

  const authVersion = authSessionCoordinator.getSessionVersion();
  const context = ObservabilityContext.create(
    createInitialContextAttributes(publicAppConfig.mode),
    authVersion
  );
  context.setEnvironment(readEnvironment());

  let sdk: ReturnType<typeof startObservabilitySdk>;
  try {
    sdk = startObservabilitySdk({
      resourceAttributes: context.getResourceAttributes(),
      applyXhrApiAttributes,
    });
  } catch {
    return () => undefined;
  }
  if (!sdk) return () => undefined;

  const aggregation = new ErrorAggregation(createOtelEventSink(sdk.tracer, sdk.logger));
  const cleanups: (() => void)[] = [];
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
  let timer: number | undefined;
  let stopped = false;
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    for (const cleanup of cleanups.reverse()) cleanup();
    if (timer !== undefined) window.clearInterval(timer);
    flushObservabilityEvents(true);
    setActiveObservabilityRuntime(undefined);
    void sdk.shutdown().catch(() => undefined);
    if (activeStop === stop) activeStop = undefined;
  };

  try {
    setActiveObservabilityRuntime({
      context,
      aggregation,
      logger: sdk.logger,
      tracer: sdk.tracer,
    });
    cleanups.push(installRouteObservation(router, context));
    cleanups.push(
      authSessionCoordinator.subscribe(() => {
        aggregation.flush(true);
        context.resetIdentity(authSessionCoordinator.getSessionVersion());
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
    activeStop = stop;
    return stop;
  } catch {
    stop();
    return () => undefined;
  }
};
