import { toast } from '@heroui/react';
import { type ChangeEvent, type ReactElement, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DRIVE_DOCUMENT_FILE_ACCEPT,
  getSupportedDriveDocumentFiles,
  useDriveDocumentUpload,
} from '@/components/business/Drive/common/useDriveDocumentUpload';
import {
  DriveCreateModal,
  type DriveCreateType,
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
import { useNewNoteStore } from '@/components/business/Note/_store/useNewNoteStore';
import {
  MARKDOWN_NOTE_FILE_ACCEPT,
  useMarkdownNoteImport,
} from '@/components/business/Note/useMarkdownNoteImport';
import { useDriveService, useNoteService } from '@/domains';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';
import { useOpenResource } from '@/hooks/useOpenResource';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';

import type { DriveActionTarget } from '../../common/driveComponentModel';
import { resolveCurrentDriveContainer } from '../../common/driveComponentModel';
import type { DriveTableRow, TableDriveActionConfig } from '../index.type';
import type { CreateMenuItem } from '../parts/CreateMenu/index.type';

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
  showCreateMenu: boolean;
  showUploadToGroup: boolean;
  showManagePermission: boolean;
  createMenuItems: CreateMenuItem[];
  handleCreateMenuSelect: (id: CreateMenuItem['id']) => void;
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
  canCreateNote: true,
  canCreateDrawio: true,
  canCreateSkill: true,
  canCreateAgent: true,
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
  const openResource = useOpenResource();
  const groupId = scope.type === 'group' ? scope.groupId : undefined;
  const noteService = useNoteService();
  const driveService = useDriveService();
  const toolbarConfig = { ...DEFAULT_TOOLBAR_CONFIG, ...actions?.toolbar };

  const selectedNodes = selectedActionTargets;
  const { loading: batchDeleting, run: executeBatchDelete } = useApi(
    async () => {
      if (selectedNodes.length === 0) return;
      if (scope.type === 'group') {
        await driveService.removeNodesFromGroup({ nodes: selectedNodes });
        return;
      }
      await driveService.moveNodesToTrash({ nodes: selectedNodes });
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
  const [driveCreateType, setDriveCreateType] = useState<DriveCreateType | null>(null);
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
  const resourceDriveLocation = mountTagId ? { scope, mountTagId } : undefined;

  const {
    fileInputRef: markdownFileInputRef,
    importing: importingMarkdownNote,
    openFilePicker: openMarkdownFilePicker,
    handleFileChange: handleMarkdownFileChange,
  } = useMarkdownNoteImport({
    getPathTagId: () => mountTagId,
    onSuccess: ({ resourceId, title }) => {
      refresh();
      openResource({
        resourceId,
        resourceType: RESOURCE_KIND.NOTE,
        resourceName: title,
        driveLocation: resourceDriveLocation,
      });
    },
  });
  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const { queueDocuments } = useDriveDocumentUpload({ pathTagId: mountTagId, onSuccess: refresh });

  const { loading: creatingNote, run: runCreateNote } = useApi(
    async () => {
      const { resourceId } = await noteService.createNote({
        title: t('create.defaultNoteTitle'),
        pathTagId: mountTagId,
      });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      return resourceId;
    },
    {
      manual: true,
      onSuccess: (resourceId) => {
        useNewNoteStore.getState().setNewNoteResourceId(resourceId);
        refresh();
        openResource({
          resourceId,
          resourceType: RESOURCE_KIND.NOTE,
          driveLocation: resourceDriveLocation,
        });
      },
    }
  );

  const handleDriveCreateSuccess = (createdId: string, type: DriveCreateType) => {
    if (type === 'folder') {
      setDriveCreateType(null);
      refresh();
      return;
    }
    setDriveCreateType(null);
    refresh();
    openResource({
      resourceId: createdId,
      resourceType: type,
      driveLocation: resourceDriveLocation,
    });
  };

  const ModalHost = (
    <>
      <input
        ref={documentFileInputRef}
        type="file"
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
      <input
        ref={markdownFileInputRef}
        type="file"
        accept={MARKDOWN_NOTE_FILE_ACCEPT}
        onChange={handleMarkdownFileChange}
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
      {driveCreateType ? (
        <DriveCreateModal
          type={driveCreateType}
          isOpen
          parent={resolveCurrentDriveContainer(currentNodeId, pathNodes)}
          pathTagId={mountTagId}
          existingFolderNames={existingFolderNames}
          onOpenChange={(open) => {
            if (!open) setDriveCreateType(null);
          }}
          onSuccess={handleDriveCreateSuccess}
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

  const handleCreateNote = () => {
    if (creatingNote) return;
    const pendingNewNoteId = useNewNoteStore.getState().newNoteResourceId;
    if (!groupId && pendingNewNoteId) {
      openResource({
        resourceId: pendingNewNoteId,
        resourceType: RESOURCE_KIND.NOTE,
        driveLocation: resourceDriveLocation,
      });
      return;
    }
    runCreateNote();
  };

  const handleCreateMenuSelect = (id: CreateMenuItem['id']) => {
    switch (id) {
      case 'folder':
      case 'drawio':
      case 'skill':
      case 'agent':
        setDriveCreateType(id);
        break;
      case 'note':
        handleCreateNote();
        break;
      case 'importNote':
        openMarkdownFilePicker();
        break;
      case 'upload':
        documentFileInputRef.current?.click();
        break;
    }
  };

  const canCreateInCurrentFolder = Boolean(mountTagId);
  const showUploadDocument = canCreateInCurrentFolder && !isTrashView;

  const showCreateMenu = Boolean(
    !disabled &&
    !isTrashView &&
    (toolbarConfig.canCreateFolder ||
      (canCreateInCurrentFolder &&
        (toolbarConfig.canCreateNote ||
          toolbarConfig.canCreateDrawio ||
          toolbarConfig.canCreateSkill ||
          toolbarConfig.canCreateAgent ||
          showUploadDocument)))
  );

  const createMenuItems = (() => {
    if (!showCreateMenu) return [];
    const items: CreateMenuItem[] = [];
    if (toolbarConfig.canCreateFolder) {
      items.push({ id: 'folder', label: t('create.folder') });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateDrawio) {
      items.push({ id: 'drawio', label: t('create.drawio') });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateNote) {
      items.push({ id: 'note', label: t('create.note'), disabled: creatingNote });
      items.push({
        id: 'importNote',
        label: t('create.importNote'),
        disabled: importingMarkdownNote,
      });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateSkill) {
      items.push({ id: 'skill', label: t('create.skill') });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateAgent)
      items.push({ id: 'agent', label: t('create.agent') });
    if (showUploadDocument) {
      items.push({ id: 'upload', label: t('create.upload') });
    }
    return items;
  })() satisfies CreateMenuItem[];

  return {
    showCreateMenu,
    showUploadToGroup: Boolean(!disabled && toolbarConfig.canUploadToGroup && groupId),
    showManagePermission: Boolean(toolbarConfig.canManageTagPermission && groupId),
    createMenuItems,
    handleCreateMenuSelect,
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
