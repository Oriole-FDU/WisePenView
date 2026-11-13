import { toast } from '@heroui/react';
import { type ChangeEvent, type ReactElement, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { HiddenFileInput } from '@/components/base/Input';
import {
  DRIVE_DOCUMENT_FILE_ACCEPT,
  getSupportedDriveDocumentFiles,
  useDriveDocumentUpload,
} from '@/components/business/Drive/common/useDriveDocumentUpload';
import { requestDriveRefresh } from '@/components/business/Drive/driveRefresh';
import {
  DriveCreateModal,
  DriveDeleteModal,
  MoveNodeModal,
  RenameNodeModal,
  ResourcePermissionModal,
  type ResourcePermissionModalTarget,
  TagMountPermissionModal,
  TagPermissionModal,
  TrashDeleteModal,
  UploadFileToGroupModal,
} from '@/components/business/Drive/Modals';
import { useDriveService } from '@/domains';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';

import type { DriveActionTarget } from '../../common/driveComponentModel';
import { resolveCurrentDriveContainer } from '../../common/driveComponentModel';
import type { DriveTableRow, TableDriveActionConfig } from '../index.type';

interface UseTableDriveActionsControllerParams {
  currentNodeId: string;
  currentRows: DriveTableRow[];
  selectedActionTargets: DriveActionTarget[];
  pathNodes: DriveNode[];
  scope: DriveNodeScope;
  actions?: TableDriveActionConfig;
  disabled?: boolean;
  refresh: () => void;
  mountTagId: string | undefined;
  isTrashView: boolean;
  onNodeActionSuccess: () => void;
}

interface UseTableDriveActionsControllerReturn {
  showUploadDocument: boolean;
  showCreateFolder: boolean;
  showUploadToGroup: boolean;
  showManagePermission: boolean;
  openUploadDocument: () => void;
  openCreateFolder: () => void;
  openUploadToGroup: () => void;
  openTagAccessPermission: (tagId: string) => void;
  openTagMountPermission: (tagId: string) => void;
  openResourcePermission: (target: ResourcePermissionModalTarget) => void;
  batchDeleting: boolean;
  runBatchDelete: () => void;
  renameTarget: DriveActionTarget | null;
  moveNodes: DriveActionTarget[];
  deleteTarget: DriveActionTarget | null;
  setRenameTarget: (target: DriveActionTarget | null) => void;
  setMoveNodes: (nodes: DriveActionTarget[]) => void;
  setDeleteTarget: (target: DriveActionTarget | null) => void;
  ModalHost: ReactElement;
}

const DEFAULT_TOOLBAR_CONFIG: Required<NonNullable<TableDriveActionConfig['toolbar']>> = {
  canCreateFolder: true,
  canUploadToGroup: false,
  canManageTagPermission: false,
};

export function useTableDriveActionsController({
  currentNodeId,
  currentRows,
  selectedActionTargets,
  pathNodes,
  scope,
  actions,
  disabled = false,
  refresh,
  mountTagId,
  isTrashView,
  onNodeActionSuccess,
}: UseTableDriveActionsControllerParams): UseTableDriveActionsControllerReturn {
  const { t } = useTranslation('drive');
  const groupId = scope.type === 'group' ? scope.groupId : undefined;
  const driveService = useDriveService();
  const toolbarConfig = { ...DEFAULT_TOOLBAR_CONFIG, ...actions?.toolbar };

  const selectedNodes = selectedActionTargets;
  const { loading: batchDeleting, run: executeBatchDelete } = useApi(
    async () => {
      if (selectedNodes.length === 0) return;
      if (scope.type === 'group') {
        await driveService.removeNodesFromGroup({ nodes: selectedNodes });
      } else {
        await driveService.moveNodesToTrash({ nodes: selectedNodes });
      }
      requestDriveRefresh();
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('table.batchDeleted', { count: selectedNodes.length }));
        onNodeActionSuccess();
      },
      onErrorEffect: () => {
        refresh();
      },
    }
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [tagAccessPermissionTagId, setTagAccessPermissionTagId] = useState<string>();
  const [tagMountPermissionTagId, setTagMountPermissionTagId] = useState<string>();
  const [resourcePermissionTarget, setResourcePermissionTarget] =
    useState<ResourcePermissionModalTarget | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DriveActionTarget | null>(null);
  const [moveNodes, setMoveNodes] = useState<DriveActionTarget[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DriveActionTarget | null>(null);
  const [trashDeleteNodes, setTrashDeleteNodes] = useState<DriveActionTarget[]>([]);

  const runBatchDelete = () => {
    if (selectedNodes.length === 0) return;
    if (isTrashView) {
      setTrashDeleteNodes(selectedNodes);
      return;
    }
    executeBatchDelete();
  };

  const existingFolderNames = currentRows
    .filter((row) => row.node.type === 'folder')
    .map((row) => row.name.trim());
  const currentContainer = resolveCurrentDriveContainer(currentNodeId, pathNodes);
  const canCreateFolder = Boolean(
    currentContainer && (currentContainer.type === 'root' || !currentContainer.systemType)
  );

  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const { queueDocuments } = useDriveDocumentUpload({ pathTagId: mountTagId, onSuccess: refresh });

  const handleCreateFolderSuccess = () => {
    setCreateFolderOpen(false);
    refresh();
  };

  const ModalHost = (
    <>
      <HiddenFileInput
        ref={documentFileInputRef}
        accept={DRIVE_DOCUMENT_FILE_ACCEPT}
        multiple
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (files.length === 0) return;
          const supportedFiles = getSupportedDriveDocumentFiles(files);
          if (supportedFiles.length !== files.length) {
            toast.warning(t('upload.feedback.unsupportedType'));
          }
          if (supportedFiles.length === 0) return;
          queueDocuments(supportedFiles);
          toast.success(t('upload.feedback.queued', { count: supportedFiles.length }));
        }}
        hidden
      />
      {groupId && uploadOpen ? (
        <UploadFileToGroupModal
          isOpen={uploadOpen}
          groupId={groupId}
          onOpenChange={setUploadOpen}
          onSuccess={refresh}
        />
      ) : null}
      {groupId && tagAccessPermissionTagId ? (
        <TagPermissionModal
          isOpen={Boolean(tagAccessPermissionTagId)}
          groupId={groupId}
          initialTagId={tagAccessPermissionTagId}
          onOpenChange={(open) => {
            if (!open) {
              setTagAccessPermissionTagId(undefined);
            }
          }}
          onSuccess={refresh}
        />
      ) : null}
      {groupId && tagMountPermissionTagId ? (
        <TagMountPermissionModal
          isOpen={Boolean(tagMountPermissionTagId)}
          groupId={groupId}
          initialTagId={tagMountPermissionTagId}
          onOpenChange={(open) => {
            if (!open) {
              setTagMountPermissionTagId(undefined);
            }
          }}
          onSuccess={refresh}
        />
      ) : null}
      {groupId && resourcePermissionTarget ? (
        <ResourcePermissionModal
          isOpen={Boolean(resourcePermissionTarget)}
          groupId={groupId}
          target={resourcePermissionTarget}
          onOpenChange={(open) => {
            if (!open) {
              setResourcePermissionTarget(null);
            }
          }}
          onSuccess={refresh}
        />
      ) : null}
      {createFolderOpen ? (
        <DriveCreateModal
          type="folder"
          isOpen
          parent={resolveCurrentDriveContainer(currentNodeId, pathNodes)}
          pathTagId={mountTagId}
          existingFolderNames={existingFolderNames}
          onOpenChange={(open) => {
            if (!open) setCreateFolderOpen(false);
          }}
          onSuccess={handleCreateFolderSuccess}
        />
      ) : null}
      <RenameNodeModal
        isOpen={Boolean(renameTarget)}
        node={renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSuccess={refresh}
      />
      <MoveNodeModal
        isOpen={moveNodes.length > 0}
        nodes={moveNodes}
        rootId={scope.rootId}
        groupId={groupId}
        isTrashView={isTrashView}
        onOpenChange={(open) => {
          if (!open) setMoveNodes([]);
        }}
        onSuccess={onNodeActionSuccess}
        onError={refresh}
      />
      {isTrashView ? (
        <TrashDeleteModal
          isOpen={Boolean(deleteTarget) || trashDeleteNodes.length > 0}
          nodes={
            trashDeleteNodes.length > 0 ? trashDeleteNodes : deleteTarget ? [deleteTarget] : []
          }
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
              setTrashDeleteNodes([]);
            }
          }}
          onSuccess={onNodeActionSuccess}
        />
      ) : (
        <DriveDeleteModal
          isOpen={Boolean(deleteTarget)}
          node={deleteTarget}
          groupId={groupId}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onSuccess={onNodeActionSuccess}
          onError={refresh}
        />
      )}
    </>
  );

  const openUploadToGroup = () => {
    setUploadOpen(true);
  };

  const canCreateInCurrentFolder = Boolean(mountTagId);
  const showUploadDocument = canCreateInCurrentFolder && !isTrashView;
  const showCreateFolder = Boolean(
    !disabled && !isTrashView && toolbarConfig.canCreateFolder && canCreateFolder
  );

  return {
    showUploadDocument: Boolean(!disabled && showUploadDocument),
    showCreateFolder,
    showUploadToGroup: Boolean(!disabled && toolbarConfig.canUploadToGroup && groupId),
    showManagePermission: Boolean(toolbarConfig.canManageTagPermission && groupId),
    openUploadDocument: () => documentFileInputRef.current?.click(),
    openCreateFolder: () => setCreateFolderOpen(true),
    openUploadToGroup,
    openTagAccessPermission: setTagAccessPermissionTagId,
    openTagMountPermission: setTagMountPermissionTagId,
    openResourcePermission: setResourcePermissionTarget,
    ModalHost,
    batchDeleting,
    runBatchDelete,
    renameTarget,
    moveNodes,
    deleteTarget,
    setRenameTarget,
    setMoveNodes,
    setDeleteTarget,
  };
}
