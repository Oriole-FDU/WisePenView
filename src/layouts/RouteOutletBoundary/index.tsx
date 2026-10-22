import type { ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { useLocation } from 'react-router-dom';

import { ErrorPage } from '@/components/business/ErrorPage';
import { reportError } from '@/utils/error';

import styles from './style.module.scss';

interface RouteOutletBoundaryProps {
  children: ReactNode;
}

/** 壳内兜底：主操作交还 resetErrorBoundary，只重试内容区而不整页刷新。 */
function RouteOutletFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className={styles.root}>
      <ErrorPage error={error} onRetry={resetErrorBoundary} showPathname />
    </div>
  );
}

function RouteOutletBoundary({ children }: RouteOutletBoundaryProps) {
  const location = useLocation();

  return (
    <ErrorBoundary
      FallbackComponent={RouteOutletFallback}
      resetKeys={[location.key, location.pathname, location.search]}
      onError={(error, errorInfo) => {
        reportError(error, {
          origin: 'layout-boundary',
          pathname: location.pathname,
          componentStack: errorInfo.componentStack ?? undefined,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default RouteOutletBoundary;
