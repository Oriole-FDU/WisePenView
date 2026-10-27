import type { ComponentType, ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { captureException } from './capture/exception';

interface ObservedErrorBoundaryProps {
  children: ReactNode;
  detector: 'root-fallback' | 'route-fallback';
  FallbackComponent: ComponentType<FallbackProps>;
  resetKeys?: unknown[];
}

/** 统一记录 React render 错误，错误展示仍由调用方提供的 fallback 负责。 */
export function ObservedErrorBoundary({
  children,
  detector,
  FallbackComponent,
  resetKeys,
}: ObservedErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={FallbackComponent}
      resetKeys={resetKeys}
      onError={(error, errorInfo) => {
        captureException(error, {
          detector,
          componentStack: errorInfo.componentStack ?? undefined,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
