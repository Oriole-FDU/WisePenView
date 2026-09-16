import { Toast, toast } from '@heroui/react';
import { useMount, useUnmount } from 'ahooks';
import { Suspense, useRef } from 'react';
import { type ClientOnErrorFunction, RouterProvider } from 'react-router-dom';

import { Spin } from '@/components/base/Feedback';
import { ServicesProvider } from '@/domains';
import { clearAllServiceCaches } from '@/domains/_shared/cacheRegistry';
import DesktopWindowControls from '@/layouts/_common/DesktopWindowControls';
import { useViewportLayoutScale } from '@/layouts/_common/useViewportLayoutScale';
import { resetSessionStores } from '@/store/lifecycle';
import { DEFAULT_HEROUI_THEME, ThemeApplier } from '@/theme';
import { authSessionCoordinator, type AuthSessionEvent } from '@/utils/auth/authSessionCoordinator';
import { reportError } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import styles from './App.module.less';
import { buildLoginPathForCurrentLocation } from './authContinuation';
import router from './router';

const UNAUTHORIZED_TOAST_DEBOUNCE_MS = 3000;
let lastUnauthorizedToastAt = 0;

const resetSessionState = (): void => {
  clearAllServiceCaches();
  resetSessionStores();
};

const redirectToLogin = (): void => {
  if (window.location.pathname !== APP_ROUTE_PATH.AUTH_LOGIN) {
    window.location.replace(buildLoginPathForCurrentLocation());
  }
};

const handleRouterError: ClientOnErrorFunction = (error, { errorInfo, location }) => {
  reportError(error, {
    origin: 'route',
    pathname: location.pathname,
    componentStack: errorInfo?.componentStack ?? undefined,
  });
};

function PageLoadingFallback() {
  return (
    <div className={styles.pageLoadingFallback}>
      <Spin size="large" />
    </div>
  );
}

function App() {
  const unsubscribeAuthSessionRef = useRef<(() => void) | null>(null);
  const sessionEndedRef = useRef(false);
  useViewportLayoutScale();

  const handleAuthSessionEvent = (event: AuthSessionEvent): void => {
    if (event.type === 'login') {
      sessionEndedRef.current = false;
      resetSessionState();
      return;
    }

    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    resetSessionState();
    if (event.type === 'unauthorized') {
      const now = Date.now();
      if (now - lastUnauthorizedToastAt >= UNAUTHORIZED_TOAST_DEBOUNCE_MS) {
        lastUnauthorizedToastAt = now;
        toast.danger('无权访问');
      }
    }
    redirectToLogin();
  };

  useMount(() => {
    unsubscribeAuthSessionRef.current = authSessionCoordinator.subscribe(handleAuthSessionEvent);
  });

  useUnmount(() => {
    unsubscribeAuthSessionRef.current?.();
    unsubscribeAuthSessionRef.current = null;
  });

  return (
    <ThemeApplier defaultTheme={DEFAULT_HEROUI_THEME}>
      <ServicesProvider>
        <Toast.Provider maxVisibleToasts={3} placement="top" />
        {/* 与 Chat 侧栏动画解耦：固定右上，避免随 Header 迁移产生卡顿 */}
        <DesktopWindowControls />
        <Suspense fallback={<PageLoadingFallback />}>
          <RouterProvider router={router} onError={handleRouterError} />
        </Suspense>
      </ServicesProvider>
    </ThemeApplier>
  );
}

export default App;
