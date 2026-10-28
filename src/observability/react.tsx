/**
 * React ErrorBoundary 的遥测适配器。
 *
 * 只记录 React render 异常，错误展示和重试仍由调用方提供的 fallback 负责。
 */
import type { ComponentType, ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { captureException } from './capture';
import type { ExceptionDetector } from './types';

interface ObservedErrorBoundaryProps {
  children: ReactNode;
  detector: Extract<ExceptionDetector, 'root-fallback' | 'route-fallback'>;
  FallbackComponent: ComponentType<FallbackProps>;
  resetKeys?: unknown[];
}

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
