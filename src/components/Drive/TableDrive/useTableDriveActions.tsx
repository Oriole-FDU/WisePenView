import {
  DriveCreateModal,
  ResourcePermissionModal,
  TagMountPermissionModal,
  TagPermissionModal,
  UploadDocumentModal,
  UploadFileToGroupModal,
  type DriveCreateType,
  type ResourcePermissionModalTarget,
} from '@/components/Drive/Modals';
import { useNewNoteStore } from '@/components/Note/_store/useNewNoteStore';
import {
  MARKDOWN_NOTE_FILE_ACCEPT,
  useMarkdownNoteImport,
} from '@/components/Note/useMarkdownNoteImport';
import { useDocumentService, useDriveService, useNoteService, useResourceService } from '@/domains';
import type { DriveNodeScope } from '@/domains/Drive';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { mountResourceToFolderTag } from '../common/driveComponentModel';
import type { DriveTableRow, TableDriveActionConfig } from './index.type';
import type { CreateMenuItem } from './parts/CreateMenu/index.type';

interface UseTableDriveActionsParams {
  currentNodeId: string;
  currentRows: DriveTableRow[];
  scope: DriveNodeScope;
  actions?: TableDriveActionConfig;
  refresh: () => void;
  mountTagId: string | undefined;
  isTrashView: boolean;
}

interface UseTableDriveActionsReturn {
  showCreateMenu: boolean;
  showUploadToGroup: boolean;
  showManagePermission: boolean;
  createMenuItems: CreateMenuItem[];
  handleCreateMenuSelect: (id: CreateMenuItem['id']) => void;
  openUploadToGroup: () => void;
  openTagAccessPermission: (tagId: string) => void;
  openTagMountPermission: (tagId: string) => void;
  openResourcePermission: (target: ResourcePermissionModalTarget) => void;
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

export function useTableDriveActions({
  currentNodeId,
  currentRows,
  scope,
  actions,
  refresh,
  mountTagId,
  isTrashView,
}: UseTableDriveActionsParams): UseTableDriveActionsReturn {
  const { t } = useTranslation('drive');
  const openInWorkspace = useOpenInWorkspace();
  const groupId = scope.type === 'group' ? scope.groupId : undefined;
  const noteService = useNoteService();
  const driveService = useDriveService();
  const documentService = useDocumentService();
  const resourceService = useResourceService();
  const toolbarConfig = { ...DEFAULT_TOOLBAR_CONFIG, ...actions?.toolbar };

  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tagAccessPermissionTagId, setTagAccessPermissionTagId] = useState<string>();
  const [tagMountPermissionTagId, setTagMountPermissionTagId] = useState<string>();
  const [resourcePermissionTarget, setResourcePermissionTarget] =
    useState<ResourcePermissionModalTarget | null>(null);
  const [driveCreateType, setDriveCreateType] = useState<DriveCreateType | null>(null);

  const existingFolderNames = currentRows
    .filter((row) => row.node.type === 'folder')
    .map((row) => row.name.trim());

  const mountCreatedResource = async (resourceId: string) => {
    if (!mountTagId) return;
    if (groupId) {
      const sharedTagId = await driveService.ensureSharedFolder();
      await mountResourceToFolderTag({
        resourceId,
        targetTagId: sharedTagId,
        documentService,
        resourceService,
      });
      await resourceService.mountResourcesToGroupTag({
        resourceIds: [resourceId],
        groupId,
        tagId: mountTagId,
      });
      return;
    }
    await mountResourceToFolderTag({
      resourceId,
      targetTagId: mountTagId,
      documentService,
      resourceService,
    });
  };

  const {
    fileInputRef: markdownFileInputRef,
    importing: importingMarkdownNote,
    openFilePicker: openMarkdownFilePicker,
    handleFileChange: handleMarkdownFileChange,
  } = useMarkdownNoteImport({
    mountCreatedResource,
    onSuccess: ({ resourceId, title }) => {
      refresh();
      openInWorkspace({
        resourceId,
        resourceType: RESOURCE_KIND.NOTE,
        resourceName: title,
        driveLocation: { scope, parentNodeId: currentNodeId },
      });
    },
  });

  const { loading: creatingNote, run: runCreateNote } = useRequest(
    async () => {
      const { resourceId } = await noteService.createNote({ title: t('create.defaultNoteTitle') });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      await mountCreatedResource(resourceId);
      return resourceId;
    },
    {
      manual: true,
      onSuccess: (resourceId) => {
        useNewNoteStore.getState().setNewNoteResourceId(resourceId);
        refresh();
        openInWorkspace({
          resourceId,
          resourceType: RESOURCE_KIND.NOTE,
          driveLocation: { scope, parentNodeId: currentNodeId },
        });
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleDriveCreateSuccess = async (createdId: string, type: DriveCreateType) => {
    if (type === 'folder') {
      setDriveCreateType(null);
      refresh();
      return;
    }
    await mountCreatedResource(createdId);
    setDriveCreateType(null);
    refresh();
    openInWorkspace({
      resourceId: createdId,
      resourceType: type,
      driveLocation: { scope, parentNodeId: currentNodeId },
    });
  };

  const ModalHost = (
    <>
      <input
        ref={markdownFileInputRef}
        type="file"
        accept={MARKDOWN_NOTE_FILE_ACCEPT}
        onChange={handleMarkdownFileChange}
        hidden
      />
      <UploadDocumentModal
        isOpen={uploadDocumentOpen}
        onOpenChange={setUploadDocumentOpen}
        onSuccess={refresh}
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
          parentId={currentNodeId}
          groupId={groupId}
          existingFolderNames={existingFolderNames}
          onOpenChange={(open) => {
            if (!open) setDriveCreateType(null);
          }}
          onSuccess={handleDriveCreateSuccess}
        />
      ) : null}
    </>
  );

  const openUploadToGroup = () => {
    setUploadOpen(true);
  };

  const handleCreateNote = () => {
    if (creatingNote) return;
    const pendingNewNoteId = useNewNoteStore.getState().newNoteResourceId;
    if (!groupId && pendingNewNoteId) {
      openInWorkspace({
        resourceId: pendingNewNoteId,
        resourceType: RESOURCE_KIND.NOTE,
        driveLocation: { scope, parentNodeId: currentNodeId },
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
        setUploadDocumentOpen(true);
        break;
    }
  };

  const showUploadDocument =
    scope.type === 'personal' && currentNodeId === scope.rootId && !isTrashView;

  const canCreateInCurrentFolder = Boolean(mountTagId);

  const showCreateMenu = Boolean(
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
    showUploadToGroup: Boolean(toolbarConfig.canUploadToGroup && groupId),
    showManagePermission: Boolean(toolbarConfig.canManageTagPermission && groupId),
    createMenuItems,
    handleCreateMenuSelect,
    openUploadToGroup,
    openTagAccessPermission: setTagAccessPermissionTagId,
    openTagMountPermission: setTagMountPermissionTagId,
    openResourcePermission: setResourcePermissionTarget,
    ModalHost,
  };
}
