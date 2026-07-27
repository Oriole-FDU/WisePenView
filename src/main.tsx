import '@/i18n';
import '@fontsource-variable/noto-sans-sc/wght.css';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './bootstrap/App';
import './bootstrap/index.css';
import { syncViewportLayoutScale } from './layouts/_common/applyLayoutScaleCssVars';
import { installGlobalErrorReporting, reportError } from './utils/error';
import RootErrorFallback from './views/app/error/RootErrorFallback';

syncViewportLayoutScale();
installGlobalErrorReporting();

const root = createRoot(document.getElementById('root')!, {
  onUncaughtError: (error, errorInfo) => {
    reportError(error, {
      origin: 'react-uncaught',
      pathname: window.location.pathname,
      componentStack: errorInfo.componentStack ?? undefined,
    });
  },
  onRecoverableError: (error, errorInfo) => {
    reportError(error, {
      origin: 'react-recoverable',
      pathname: window.location.pathname,
      componentStack: errorInfo.componentStack ?? undefined,
    });
  },
});

root.render(
  <ErrorBoundary
    FallbackComponent={RootErrorFallback}
    onError={(error, errorInfo) => {
      reportError(error, {
        origin: 'root-boundary',
        pathname: window.location.pathname,
        componentStack: errorInfo.componentStack ?? undefined,
      });
    }}
  >
    <App />
  </ErrorBoundary>
);
