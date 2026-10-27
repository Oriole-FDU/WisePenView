// eslint-disable-next-line simple-import-sort/imports -- i18n 必须先初始化；全局样式保持在 App 样式之后、错误页样式之前。
import '@/i18n';
import '@fontsource-variable/noto-sans-sc/wght.css';
import { createRoot } from 'react-dom/client';
import { captureException, ObservedErrorBoundary } from '@/observability';
import App from './bootstrap/App';
import { startAppObservability } from './bootstrap/observability';
import './styles/global/index.css';
import './styles/global/scrollbar.scss';
import './styles/global/app-shell.css';
import { syncViewportLayoutScale } from '@/utils/browser/layoutScale';
import RootErrorFallback from './views/app/error/RootErrorFallback';

const stopObservability = startAppObservability();
import.meta.hot?.dispose(stopObservability);
syncViewportLayoutScale();

const root = createRoot(document.getElementById('root')!, {
  onUncaughtError: (error, errorInfo) => {
    captureException(error, {
      detector: 'react-root-uncaught',
      componentStack: errorInfo.componentStack ?? undefined,
    });
  },
  onRecoverableError: (error, errorInfo) => {
    captureException(error, {
      detector: 'react-root-recoverable',
      componentStack: errorInfo.componentStack ?? undefined,
    });
  },
});

root.render(
  <ObservedErrorBoundary detector="root-fallback" FallbackComponent={RootErrorFallback}>
    <App />
  </ObservedErrorBoundary>
);
