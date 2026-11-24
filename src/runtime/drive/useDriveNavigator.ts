import { useSyncExternalStore } from 'react';

import { useApi } from '@/hooks/useApi';

import type {
  DriveTreeRequest,
  DriveTreeRuntime,
  DriveTreeSnapshot,
} from './DriveTreeRuntime/index.type';
import { getDriveRuntime } from './getDriveRuntime';

export interface UseDriveNavigatorOptions {
  ready?: boolean;
  onError?: (error: unknown, runtime: DriveTreeRuntime) => void;
}

export interface UseDriveNavigatorResult {
  runtime: DriveTreeRuntime;
  snapshot: DriveTreeSnapshot;
}

export function useDriveNavigator(
  request: DriveTreeRequest,
  { ready = true, onError }: UseDriveNavigatorOptions = {}
): UseDriveNavigatorResult {
  const runtime = getDriveRuntime().acquireTree(request);
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
