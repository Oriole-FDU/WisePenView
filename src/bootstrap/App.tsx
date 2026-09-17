import { Spin } from '@/components/Feedback';
import { ServicesProvider } from '@/domains';
import DesktopWindowControls from '@/layouts/_common/DesktopWindowControls';
import { useViewportLayoutScale } from '@/layouts/_common/useViewportLayoutScale';
import { DEFAULT_HEROUI_THEME, ThemeApplier } from '@/theme';
import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';
import { reportError } from '@/utils/error';
import { Toast } from '@heroui/react';
import { useMount, useUnmount } from 'ahooks';
import { Suspense, useRef } from 'react';
import { RouterProvider, type ClientOnErrorFunction } from 'react-router-dom';
import styles from './App.module.less';
import router from './router';

const MAX_VISIBLE_TOASTS = 3;

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
  useViewportLayoutScale();

  useMount(() => {
    unsubscribeAuthSessionRef.current = authSessionCoordinator.subscribe();
  });

  useUnmount(() => {
    unsubscribeAuthSessionRef.current?.();
    unsubscribeAuthSessionRef.current = null;
  });

  return (
    <ThemeApplier defaultTheme={DEFAULT_HEROUI_THEME}>
      <ServicesProvider>
        <Toast.Provider maxVisibleToasts={MAX_VISIBLE_TOASTS} placement="top" />
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
