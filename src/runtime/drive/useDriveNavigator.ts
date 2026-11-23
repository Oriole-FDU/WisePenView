import { useSyncExternalStore } from 'react';

import { useApi } from '@/hooks/useApi';

import type {
  DriveNavigatorRequest,
  DriveNavigatorRuntime,
  DriveNavigatorSnapshot,
} from './DriveNavigatorRuntime/index.type';
import { getDriveRuntime } from './getDriveRuntime';

export interface UseDriveNavigatorOptions {
  ready?: boolean;
  onError?: (error: unknown, runtime: DriveNavigatorRuntime) => void;
}

export interface UseDriveNavigatorResult {
  runtime: DriveNavigatorRuntime;
  snapshot: DriveNavigatorSnapshot;
}

export function useDriveNavigator(
  request: DriveNavigatorRequest,
  { ready = true, onError }: UseDriveNavigatorOptions = {}
): UseDriveNavigatorResult {
  const runtime = getDriveRuntime().acquireNavigator(request);
  const snapshot = useSyncExternalStore(
    (onStoreChange) => runtime.subscribe(onStoreChange),
    () => runtime.getSnapshot(),
    () => runtime.getSnapshot()
  );

  useApi(() => runtime.initialize(), {
    ready,
    refreshDeps: [runtime],
    showErrorToast: false,
    onErrorEffect: (error) => onError?.(error, runtime),
  });

  return { runtime, snapshot };
}
