import { useDriveService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { TFunction } from 'i18next';
import { useRef } from 'react';
import type { DriveScope } from '../../common/driveComponentModel';

interface UseTableDriveTrashControllerParams {
  currentNodeId: string;
  pathNodes: DriveNode[];
  rootId: string;
  scope: DriveScope;
  onEnterFolder: (nodeId: string) => void;
  t: TFunction<'drive'>;
}

export function useTableDriveTrashController({
  currentNodeId,
  pathNodes,
  rootId,
  scope,
  onEnterFolder,
  t,
}: UseTableDriveTrashControllerParams) {
  const driveService = useDriveService();
  const beforeTrashNodeIdRef = useRef<string | null>(null);
  const canOpenTrash = scope.type === 'personal';
  const { data: trashFolderNodeId, runAsync: resolveTrashFolderNodeId } = useRequest(
    () => driveService.getTrashFolderNodeId(),
    { ready: canOpenTrash, refreshDeps: [scope.type] }
  );
  const isTrashView = Boolean(
    canOpenTrash &&
    trashFolderNodeId &&
    (currentNodeId === trashFolderNodeId || pathNodes.some((node) => node.id === trashFolderNodeId))
  );

  const openTrash = async () => {
    if (!canOpenTrash) return;
    if (isTrashView) {
      onEnterFolder(beforeTrashNodeIdRef.current ?? rootId);
      beforeTrashNodeIdRef.current = null;
      return;
    }
    try {
      const targetNodeId = trashFolderNodeId ?? (await resolveTrashFolderNodeId());
      if (!targetNodeId) {
        toast.danger(t('table.trashNotFound'));
        return;
      }
      beforeTrashNodeIdRef.current = currentNodeId;
      onEnterFolder(targetNodeId);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  return { canOpenTrash, isTrashView, openTrash };
}
