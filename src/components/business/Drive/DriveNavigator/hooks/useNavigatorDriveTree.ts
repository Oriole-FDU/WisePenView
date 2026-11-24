import { useSyncExternalStore } from 'react';

import { useApi } from '@/hooks/useApi';
import type { DriveTreeRequest, DriveTreeRuntime, DriveTreeSnapshot } from '@/runtime/drive';
import { getDriveRuntime } from '@/runtime/drive';

export interface UseNavigatorDriveTreeOptions {
  ready?: boolean;
  onError?: (error: unknown, runtime: DriveTreeRuntime) => void;
}

export interface UseNavigatorDriveTreeResult {
  runtime: DriveTreeRuntime;
  snapshot: DriveTreeSnapshot;
}

export function useNavigatorDriveTree(
  request: DriveTreeRequest,
  { ready = true, onError }: UseNavigatorDriveTreeOptions = {}
): UseNavigatorDriveTreeResult {
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
