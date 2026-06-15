import {
  DeleteNodeModal,
  MoveNodeModal,
  NewFolderNodeModal,
  RenameNodeModal,
  TagPermissionModal,
  UploadFileToGroupModal,
} from '@/components/Drive/Modals';
import type { FolderTableRowAction } from '@/components/Table';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import type { DriveActionTarget } from '../common/driveComponentModel';
import { isDriveActionTarget } from '../common/driveComponentModel';
import type { DriveRowPredicate, DriveTableRow, TableDriveActionConfig } from './index.type';

export type RowActionKind = 'rename' | 'delete' | 'move' | 'permission';

export interface UseTableDriveActionsParams {
  currentNodeId: string;
  currentRows: DriveTableRow[];
  rootId: string;
  groupId?: string;
  actions?: TableDriveActionConfig;
  refresh: () => void;
}

export interface UseTableDriveActionsReturn {
  rowActions: FolderTableRowAction<DriveTableRow>[];
  showCreateFolder: boolean;
  showUploadToGroup: boolean;
  showManagePermission: boolean;
  openNewFolder: () => void;
  openUploadToGroup: () => void;
  openTagPermission: () => void;
  ModalHost: ReactElement;
}

const DEFAULT_TOOLBAR_CONFIG: Required<NonNullable<TableDriveActionConfig['toolbar']>> = {
  canCreateFolder: true,
  canUploadToGroup: false,
  canManageTagPermission: false,
};

const DEFAULT_ROW_CONFIG: Required<NonNullable<TableDriveActionConfig['row']>> = {
  canRename: true,
  canDelete: true,
  canMove: true,
  canManageNodePermission: false,
};

const evaluatePredicate = (
  predicate: DriveRowPredicate | undefined,
  node: DriveActionTarget
): boolean => (typeof predicate === 'function' ? predicate(node) : Boolean(predicate));

export function useTableDriveActions({
  currentNodeId,
  currentRows,
  rootId,
  groupId,
  actions,
  refresh,
}: UseTableDriveActionsParams): UseTableDriveActionsReturn {
  const toolbarConfig = { ...DEFAULT_TOOLBAR_CONFIG, ...actions?.toolbar };

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tagPermissionOpen, setTagPermissionOpen] = useState(false);
  const [tagPermissionTagId, setTagPermissionTagId] = useState<string>();
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<DriveActionTarget | null>(null);
  const existingFolderNames = useMemo(
    () => currentRows.filter((row) => row.node.type === 'folder').map((row) => row.name.trim()),
    [currentRows]
  );

  const onRowAction = useCallback((kind: RowActionKind, node: DriveActionTarget) => {
    if (kind === 'rename') {
      setRenameTarget(node);
      return;
    }
    if (kind === 'delete') {
      setDeleteTarget(node);
      return;
    }
    if (kind === 'move') {
      setMoveTarget(node);
      return;
    }
    if (kind === 'permission' && node.type === 'folder') {
      setTagPermissionTagId(node.tagId);
      setTagPermissionOpen(true);
    }
  }, []);

  const rowActions = useMemo<FolderTableRowAction<DriveTableRow>[]>(() => {
    const rowConfig = { ...DEFAULT_ROW_CONFIG, ...actions?.row };

    return [
      {
        key: 'rename',
        label: '重命名',
        visible: (row) =>
          isDriveActionTarget(row.node) && evaluatePredicate(rowConfig.canRename, row.node),
        onPress: (row) => {
          if (isDriveActionTarget(row.node)) onRowAction('rename', row.node);
        },
      },
      {
        key: 'move',
        label: '移动到文件夹',
        visible: (row) =>
          isDriveActionTarget(row.node) && evaluatePredicate(rowConfig.canMove, row.node),
        onPress: (row) => {
          if (isDriveActionTarget(row.node)) onRowAction('move', row.node);
        },
      },
      {
        key: 'permission',
        label: '标签权限管理',
        visible: (row) =>
          row.node.type === 'folder' &&
          evaluatePredicate(rowConfig.canManageNodePermission, row.node),
        onPress: (row) => {
          if (row.node.type === 'folder') onRowAction('permission', row.node);
        },
      },
      {
        key: 'delete',
        label: '删除',
        variant: 'danger',
        visible: (row) =>
          isDriveActionTarget(row.node) && evaluatePredicate(rowConfig.canDelete, row.node),
        onPress: (row) => {
          if (isDriveActionTarget(row.node)) onRowAction('delete', row.node);
        },
      },
    ];
  }, [actions?.row, onRowAction]);

  const ModalHost = useMemo(
    () => (
      <>
        {newFolderOpen ? (
          <NewFolderNodeModal
            isOpen={newFolderOpen}
            parentId={currentNodeId}
            groupId={groupId}
            existingFolderNames={existingFolderNames}
            onOpenChange={setNewFolderOpen}
            onSuccess={refresh}
          />
        ) : null}
        {renameTarget ? (
          <RenameNodeModal
            isOpen={renameTarget !== null}
            node={renameTarget}
            groupId={groupId}
            onOpenChange={(open) => {
              if (!open) {
                setRenameTarget(null);
              }
            }}
            onSuccess={refresh}
          />
        ) : null}
        <DeleteNodeModal
          isOpen={deleteTarget !== null}
          node={deleteTarget}
          groupId={groupId}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
          onSuccess={refresh}
        />
        <MoveNodeModal
          isOpen={moveTarget !== null}
          node={moveTarget}
          rootId={rootId}
          groupId={groupId}
          onOpenChange={(open) => {
            if (!open) {
              setMoveTarget(null);
            }
          }}
          onSuccess={refresh}
        />
        {groupId ? (
          <UploadFileToGroupModal
            isOpen={uploadOpen}
            groupId={groupId}
            onOpenChange={setUploadOpen}
            onSuccess={refresh}
          />
        ) : null}
        <TagPermissionModal
          isOpen={tagPermissionOpen}
          groupId={groupId}
          initialTagId={tagPermissionTagId}
          onOpenChange={(open) => {
            if (!open) {
              setTagPermissionOpen(false);
              setTagPermissionTagId(undefined);
            }
          }}
          onSuccess={refresh}
        />
      </>
    ),
    [
      currentNodeId,
      existingFolderNames,
      newFolderOpen,
      renameTarget,
      deleteTarget,
      moveTarget,
      rootId,
      groupId,
      uploadOpen,
      tagPermissionOpen,
      tagPermissionTagId,
      refresh,
    ]
  );

  return {
    rowActions,
    showCreateFolder: Boolean(toolbarConfig.canCreateFolder),
    showUploadToGroup: Boolean(toolbarConfig.canUploadToGroup && groupId),
    showManagePermission: Boolean(toolbarConfig.canManageTagPermission && groupId),
    openNewFolder: () => setNewFolderOpen(true),
    openUploadToGroup: () => setUploadOpen(true),
    openTagPermission: () => {
      setTagPermissionTagId(undefined);
      setTagPermissionOpen(true);
    },
    ModalHost,
  };
}
