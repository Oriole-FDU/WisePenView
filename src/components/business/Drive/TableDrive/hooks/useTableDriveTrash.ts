import { useTranslation } from 'react-i18next';

import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';
import { getDriveRuntime } from '@/runtime/drive';

interface UseTableDriveTrashParams {
  currentNodeId: string;
  pathNodes: DriveNode[];
  scope: DriveNodeScope;
}

export function useTableDriveTrash({ currentNodeId, pathNodes, scope }: UseTableDriveTrashParams) {
  const { t } = useTranslation(['drive', 'table']);
  const driveRuntime = getDriveRuntime();
  const canOpenTrash = scope.type === 'personal';
  const { data: trashFolder } = useApi(
    () => driveRuntime.getSystemFolder({ scope, type: 'trash' }),
    {
      ready: canOpenTrash,
      refreshDeps: [scope.type],
    }
  );
  const trashFolderNodeId = trashFolder?.id;
  const isTrashRootView = Boolean(
    canOpenTrash && trashFolderNodeId && currentNodeId === trashFolderNodeId
  );
  const isTrashView = Boolean(
    canOpenTrash &&
    trashFolderNodeId &&
    (isTrashRootView || pathNodes.some((node) => node.id === trashFolderNodeId))
  );
  let emptyText: string | undefined;
  let emptyDescription: string | undefined;

  if (isTrashRootView) {
    emptyText = t('table.trashEmpty', { ns: 'drive' });
    emptyDescription = t('table.trashDescription', { ns: 'drive' });
  } else if (isTrashView) {
    emptyText = t('empty.folderEmpty', { ns: 'table' });
    emptyDescription = '';
  }

  return {
    isTrashView,
    emptyText,
    emptyDescription,
  };
}
