import { useSyncExternalStore } from 'react';

import { useApi } from '@/hooks/useApi';

import type {
  DriveForestRequest,
  DriveForestRuntime,
  DriveForestSnapshot,
} from './DriveForestRuntime/index.type';
import { getDriveRuntime } from './getDriveRuntime';

export interface UseDriveNavigatorOptions {
  ready?: boolean;
  onError?: (error: unknown, runtime: DriveForestRuntime) => void;
}

export interface UseDriveNavigatorResult {
  runtime: DriveForestRuntime;
  snapshot: DriveForestSnapshot;
}

export function useDriveNavigator(
  request: DriveForestRequest,
  { ready = true, onError }: UseDriveNavigatorOptions = {}
): UseDriveNavigatorResult {
  const runtime = getDriveRuntime().acquireForest(request);
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
