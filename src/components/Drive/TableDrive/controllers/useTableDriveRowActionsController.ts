import type { ResourcePermissionModalTarget } from '@/components/Drive/Modals';
import type { FolderTableRowAction } from '@/components/Table';
import { resolveResourceKind } from '@/utils/navigation/resourceTarget';
import { useTranslation } from 'react-i18next';
import {
  isDriveActionTarget,
  isDriveSystemFolderNode,
  type DriveActionTarget,
} from '../../common/driveComponentModel';
import type { DriveTableRow } from '../index.type';

interface UseTableDriveRowActionsControllerParams {
  groupId?: string;
  isEditMode: boolean;
  isTrashView: boolean;
  showManagePermission: boolean;
  onEnterFolder: (nodeId: string) => void;
  onOpenNode: (row: DriveTableRow) => void;
  onRename: (node: DriveActionTarget) => void;
  onMoveNodes: (nodes: DriveActionTarget[]) => void;
  onDelete: (node: DriveActionTarget) => void;
  onOpenTagAccessPermission: (tagId: string) => void;
  onOpenTagMountPermission: (tagId: string) => void;
  onOpenResourcePermission: (target: ResourcePermissionModalTarget) => void;
}

export function useTableDriveRowActionsController({
  groupId,
  isEditMode,
  isTrashView,
  showManagePermission,
  onEnterFolder,
  onOpenNode,
  onRename,
  onMoveNodes,
  onDelete,
  onOpenTagAccessPermission,
  onOpenTagMountPermission,
  onOpenResourcePermission,
}: UseTableDriveRowActionsControllerParams) {
  const { t } = useTranslation(['drive', 'resource', 'common']);

  return (row: DriveTableRow): FolderTableRowAction<DriveTableRow>[] => {
    if (isEditMode || !isDriveActionTarget(row.node)) return [];

    const actionTarget = row.node;
    if (actionTarget.type === 'folder' && actionTarget.systemType === 'shared') return [];

    const openAction: FolderTableRowAction<DriveTableRow> =
      actionTarget.type === 'folder'
        ? {
            key: 'enter',
            label: t('table.enter'),
            onPress: () => onEnterFolder(actionTarget.id),
          }
        : {
            key: 'open',
            label: t('table.open'),
            onPress: () => onOpenNode(row),
          };

    const actions: FolderTableRowAction<DriveTableRow>[] = [openAction];

    if (showManagePermission && !isTrashView) {
      if (actionTarget.type === 'folder') {
        actions.push(
          {
            key: 'tag-access-permission',
            label: t('permission.accessPermission', { ns: 'resource' }),
            onPress: () => onOpenTagAccessPermission(actionTarget.tagId),
          },
          {
            key: 'tag-mount-permission',
            label: t('permission.mountPermission', { ns: 'resource' }),
            onPress: () => onOpenTagMountPermission(actionTarget.tagId),
          }
        );
      } else if (actionTarget.type === 'resource') {
        actions.push({
          key: 'resource-permission',
          label: t('permission.resourcePermission', { ns: 'resource' }),
          onPress: () =>
            onOpenResourcePermission({
              resourceId: actionTarget.resourceId,
              resourceType: resolveResourceKind(actionTarget.resourceType),
              resourceName: row.name,
              fallbackTagId: actionTarget.folderTagId,
            }),
        });
      }
    }

    if (isDriveSystemFolderNode(actionTarget)) return actions;

    if (actionTarget.type !== 'link') {
      actions.push({
        key: 'rename',
        label: t('actions.rename', { ns: 'common' }),
        onPress: () => onRename(actionTarget),
      });
    }

    let deleteLabel: string;
    if (groupId != null) {
      deleteLabel = t('delete.remove');
    } else if (isTrashView) {
      deleteLabel = t('delete.permanent');
    } else if (actionTarget.type === 'link') {
      deleteLabel = t('delete.deleteLink');
    } else {
      deleteLabel = t('delete.moveToTrash');
    }

    actions.push(
      {
        key: 'move',
        label: isTrashView ? t('move.titleToDrive') : t('table.move'),
        onPress: () => onMoveNodes([actionTarget]),
      },
      {
        key: 'delete',
        label: deleteLabel,
        variant: 'danger',
        onPress: () => onDelete(actionTarget),
      }
    );

    return actions;
  };
}
