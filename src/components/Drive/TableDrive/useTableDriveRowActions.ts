import type { ResourcePermissionModalTarget } from '@/components/Drive/Modals';
import type { FolderTableRowAction } from '@/components/Table';
import { resolveResourceKind } from '@/utils/navigation/resourceTarget';
import { useTranslation } from 'react-i18next';
import {
  isDriveActionTarget,
  isDriveSystemFolderNode,
  type DriveActionTarget,
} from '../common/driveComponentModel';
import type { DriveTableRow } from './index.type';

interface UseTableDriveRowActionsParams {
  groupId?: string;
  isEditMode: boolean;
  isTrashView: boolean;
  showManagePermission: boolean;
  onEnterFolder: (nodeId: string) => void;
  onOpenNode: (node: DriveActionTarget) => void;
  onRename: (node: DriveActionTarget) => void;
  onMoveNodes: (nodes: DriveActionTarget[]) => void;
  onDelete: (node: DriveActionTarget) => void;
  onOpenTagAccessPermission: (tagId: string) => void;
  onOpenTagMountPermission: (tagId: string) => void;
  onOpenResourcePermission: (target: ResourcePermissionModalTarget) => void;
}

export function useTableDriveRowActions({
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
}: UseTableDriveRowActionsParams) {
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
            onPress: () => onOpenNode(actionTarget),
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

    actions.push(
      {
        key: 'move',
        label: isTrashView ? t('move.titleToDrive') : t('table.move'),
        onPress: () => onMoveNodes([actionTarget]),
      },
      {
        key: 'delete',
        label:
          groupId != null
            ? t('delete.remove')
            : isTrashView
              ? t('delete.permanent')
              : actionTarget.type === 'link'
                ? t('delete.deleteLink')
                : t('delete.moveToTrash'),
        variant: 'danger',
        onPress: () => onDelete(actionTarget),
      }
    );

    return actions;
  };
}
