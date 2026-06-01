import {
  DeleteNodeModal,
  MoveNodeModal,
  NewFolderNodeModal,
  RenameNodeModal,
  TagPermissionModal,
  UploadFileToGroupModal,
} from '@/components/Drive/Modals';
import { useMemo, useState, type ReactElement } from 'react';
import type { DriveActionTarget } from '../common/driveComponentModel';
import type { DriveRow, TableDriveActionConfig } from './index.type';

export type RowActionKind = 'rename' | 'delete' | 'move' | 'permission';

export interface UseTableDriveActionsParams {
  currentNodeId: string;
  currentRows: DriveRow[];
  rootId: string;
  groupId?: string;
  actions?: TableDriveActionConfig;
  refresh: () => void;
}

export interface UseTableDriveActionsReturn {
  onRowAction: (kind: RowActionKind, node: DriveActionTarget) => void;
  openDropdownKey: string | null;
  setOpenDropdownKey: (key: string | null) => void;
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

export function useTableDriveActions({
  currentNodeId,
  currentRows,
  rootId,
  groupId,
  actions,
  refresh,
}: UseTableDriveActionsParams): UseTableDriveActionsReturn {
  const toolbarConfig = { ...DEFAULT_TOOLBAR_CONFIG, ...actions?.toolbar };

  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tagPermissionOpen, setTagPermissionOpen] = useState(false);
  const [tagPermissionTagId, setTagPermissionTagId] = useState<string>();
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<DriveActionTarget | null>(null);
  const existingFolderNames = useMemo(
    () =>
      currentRows
        .filter((row): row is Extract<DriveRow, { type: 'folder' }> => row.type === 'folder')
        .map((row) => row.name.trim()),
    [currentRows]
  );

  const onRowAction = (kind: RowActionKind, node: DriveActionTarget) => {
    setOpenDropdownKey(null);
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
  };

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
          open={moveTarget !== null}
          node={moveTarget}
          rootId={rootId}
          groupId={groupId}
          onCancel={() => setMoveTarget(null)}
          onSuccess={refresh}
        />
        {groupId ? (
          <UploadFileToGroupModal
            open={uploadOpen}
            groupId={groupId}
            onCancel={() => setUploadOpen(false)}
            onSuccess={refresh}
          />
        ) : null}
        <TagPermissionModal
          open={tagPermissionOpen}
          groupId={groupId}
          initialTagId={tagPermissionTagId}
          onCancel={() => {
            setTagPermissionOpen(false);
            setTagPermissionTagId(undefined);
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
    onRowAction,
    openDropdownKey,
    setOpenDropdownKey,
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
