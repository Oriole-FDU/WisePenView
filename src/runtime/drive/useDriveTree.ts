import { useSyncExternalStore } from 'react';

import { useApi } from '@/hooks/useApi';

import type { DriveTreeRuntime } from './DriveTreeRuntime/index.type';
import { getDriveRuntime } from './getDriveRuntime';
import type { DriveTreeRequest, DriveTreeSnapshot } from './model/DriveTreeState';

export interface UseDriveTreeOptions {
  initialNodeId?: string;
  ready?: boolean;
  onError?: (error: unknown, runtime: DriveTreeRuntime) => void;
}

export interface UseDriveTreeResult {
  runtime: DriveTreeRuntime;
  snapshot: DriveTreeSnapshot;
}

export function useDriveTree(
  request: DriveTreeRequest,
  { initialNodeId, ready = true, onError }: UseDriveTreeOptions = {}
): UseDriveTreeResult {
  const runtime = getDriveRuntime().acquireTree(request);
  const snapshot = useSyncExternalStore(
    (onStoreChange) => runtime.subscribe(onStoreChange),
    () => runtime.getSnapshot(),
    () => runtime.getSnapshot()
  );

  useApi(
    () =>
      runtime.focus(initialNodeId ?? runtime.request.scope.rootId, {
        restoreExpanded: true,
      }),
    {
      ready,
      refreshDeps: [runtime, initialNodeId],
      showErrorToast: false,
      onErrorEffect: (error) => onError?.(error, runtime),
    }
  );

  return { runtime, snapshot };
}
