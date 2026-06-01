import { Toast } from '@heroui/react';
import { useMount, useUnmount } from 'ahooks';
import { App as AntdApp, ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Suspense, useRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';

import { ServicesProvider } from '@/domains';
import appTheme, { DEFAULT_HEROUI_THEME, ThemeApplier } from '@/theme';
import { subscribeAuthChangeEvent } from '@/utils/auth/authChange';
import styles from './App.module.less';

function PageLoadingFallback() {
  return (
    <div className={styles.pageLoadingFallback}>
      <Spin size="large" />
    </div>
  );
}

function App() {
  const unsubscribeAuthChangeRef = useRef<(() => void) | null>(null);

  useMount(() => {
    unsubscribeAuthChangeRef.current = subscribeAuthChangeEvent();
  });

  useUnmount(() => {
    unsubscribeAuthChangeRef.current?.();
    unsubscribeAuthChangeRef.current = null;
  });

  return (
    <ThemeApplier defaultTheme={DEFAULT_HEROUI_THEME}>
      <ServicesProvider>
        <ConfigProvider locale={zhCN} theme={appTheme}>
          <AntdApp>
            <Toast.Provider maxVisibleToasts={3} placement="top" />
            <Suspense fallback={<PageLoadingFallback />}>
              <RouterProvider router={router} />
            </Suspense>
          </AntdApp>
        </ConfigProvider>
      </ServicesProvider>
    </ThemeApplier>
  );
}

export default App;
