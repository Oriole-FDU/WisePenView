import {
  NewFolderNodeModal,
  ResourcePermissionModal,
  TagMountPermissionModal,
  TagPermissionModal,
  UploadDocumentModal,
  UploadFileToGroupModal,
  type ResourcePermissionModalTarget,
} from '@/components/Drive/Modals';
import { FormField, Input } from '@/components/Input';
import { useNewNoteStore } from '@/components/Note/_store/useNewNoteStore';
import {
  MARKDOWN_NOTE_FILE_ACCEPT,
  useMarkdownNoteImport,
} from '@/components/Note/useMarkdownNoteImport';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import CreateSkillModal from '@/components/Skill/CreateSkillModal';
import { useDocumentService, useDriveService, useNoteService, useResourceService } from '@/domains';
import type { DriveNodeScope } from '@/domains/Drive';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { mountResourceToFolderTag, resolveCurrentFolderTagId } from '../common/driveComponentModel';
import type { DriveTableRow, TableDriveActionConfig } from './index.type';
import type { CreateMenuItem } from './parts/CreateMenu/index.type';

export interface UseTableDriveActionsParams {
  currentNodeId: string;
  currentRows: DriveTableRow[];
  scope: DriveNodeScope;
  actions?: TableDriveActionConfig;
  refresh: () => void;
  onUploadSuccess?: () => void;
  targetTagId?: string;
  isTrashView?: boolean;
}

export interface UseTableDriveActionsReturn {
  showCreateMenu: boolean;
  showUploadToGroup: boolean;
  showManagePermission: boolean;
  createMenuItems: CreateMenuItem[];
  handleCreateMenuSelect: (id: CreateMenuItem['id']) => void;
  openUploadToGroup: () => void;
  openTagAccessPermission: (tagId: string) => void;
  openTagMountPermission: (tagId: string) => void;
  openResourcePermission: (target: ResourcePermissionModalTarget) => void;
  tagPermissionRefreshToken: number;
  resourcePermissionRefreshToken: number;
  ModalHost: ReactElement;
}

const DEFAULT_TOOLBAR_CONFIG: Required<NonNullable<TableDriveActionConfig['toolbar']>> = {
  canCreateFolder: true,
  canCreateNote: true,
  canCreateDrawio: true,
  canCreateSkill: true,
  canUploadDocument: true,
  canUploadToGroup: false,
  canManageTagPermission: false,
};

export function useTableDriveActions({
  currentNodeId,
  currentRows,
  scope,
  actions,
  refresh,
  onUploadSuccess,
  targetTagId,
  isTrashView = false,
}: UseTableDriveActionsParams): UseTableDriveActionsReturn {
  const openInWorkspace = useOpenInWorkspace();
  const groupId = scope.type === 'group' ? scope.groupId : undefined;
  const noteService = useNoteService();
  const driveService = useDriveService();
  const documentService = useDocumentService();
  const resourceService = useResourceService();
  const toolbarConfig = { ...DEFAULT_TOOLBAR_CONFIG, ...actions?.toolbar };

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);
  const [uploadMountTagId, setUploadMountTagId] = useState<string>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tagAccessPermissionTagId, setTagAccessPermissionTagId] = useState<string>();
  const [tagMountPermissionTagId, setTagMountPermissionTagId] = useState<string>();
  const [tagPermissionRefreshToken, setTagPermissionRefreshToken] = useState(0);
  const [resourcePermissionTarget, setResourcePermissionTarget] =
    useState<ResourcePermissionModalTarget | null>(null);
  const [resourcePermissionRefreshToken, setResourcePermissionRefreshToken] = useState(0);
  const [drawioModalOpen, setDrawioModalOpen] = useState(false);
  const [drawioName, setDrawioName] = useState('未命名图表');
  const [drawioNameError, setDrawioNameError] = useState('');
  const [skillModalOpen, setSkillModalOpen] = useState(false);

  const existingFolderNames = useMemo(
    () => currentRows.filter((row) => row.node.type === 'folder').map((row) => row.name.trim()),
    [currentRows]
  );

  const mountTagId = useMemo(
    () => resolveCurrentFolderTagId(currentNodeId, []) ?? targetTagId,
    [currentNodeId, targetTagId]
  );

  const mountCreatedResource = useCallback(
    async (resourceId: string) => {
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
    },
    [documentService, driveService, groupId, mountTagId, resourceService]
  );

  const handleUploadSuccess = useCallback(() => {
    refresh();
    onUploadSuccess?.();
  }, [onUploadSuccess, refresh]);

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
      const { resourceId } = await noteService.createNote({ title: '未命名笔记' });
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

  const { loading: creatingDrawio, run: runCreateDrawio } = useRequest(
    async () => {
      const title = drawioName.trim() || '未命名图表';
      const { resourceId } = await noteService.createNote({
        title,
        resourceType: 'DRAWIO',
      });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      await mountCreatedResource(resourceId);
      return resourceId;
    },
    {
      manual: true,
      onSuccess: (resourceId) => {
        setDrawioModalOpen(false);
        setDrawioNameError('');
        refresh();
        openInWorkspace({
          resourceId,
          resourceType: RESOURCE_KIND.DRAWIO,
          driveLocation: { scope, parentNodeId: currentNodeId },
        });
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleCreateSkillSuccess = useCallback(
    (resourceId: string) => {
      void (async () => {
        try {
          await mountCreatedResource(resourceId);
          setSkillModalOpen(false);
          refresh();
          openInWorkspace({
            resourceId,
            resourceType: RESOURCE_KIND.SKILL,
            driveLocation: { scope, parentNodeId: currentNodeId },
          });
        } catch (err) {
          toast.danger(parseErrorMessage(err));
        }
      })();
    },
    [currentNodeId, mountCreatedResource, openInWorkspace, refresh, scope]
  );

  const ModalHost = useMemo(
    () => (
      <>
        <input
          ref={markdownFileInputRef}
          type="file"
          accept={MARKDOWN_NOTE_FILE_ACCEPT}
          onChange={handleMarkdownFileChange}
          hidden
        />
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
        <UploadDocumentModal
          isOpen={uploadDocumentOpen}
          targetTagId={uploadMountTagId ?? targetTagId}
          groupId={groupId}
          onOpenChange={(open) => {
            setUploadDocumentOpen(open);
            if (!open) {
              setUploadMountTagId(undefined);
            }
          }}
          onSuccess={handleUploadSuccess}
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
            onSuccess={() => setTagPermissionRefreshToken((prev) => prev + 1)}
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
            onSuccess={() => setTagPermissionRefreshToken((prev) => prev + 1)}
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
            onSuccess={() => setResourcePermissionRefreshToken((prev) => prev + 1)}
          />
        ) : null}
        <AppFormDialog
          isOpen={drawioModalOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setDrawioNameError('');
            }
            setDrawioModalOpen(nextOpen);
          }}
          title="新建图表"
          confirmText="创建"
          onSubmit={() => {
            if (!drawioName.trim()) {
              setDrawioNameError('请输入图表名称');
              return;
            }
            runCreateDrawio();
          }}
          isSubmitting={creatingDrawio}
          isSubmitDisabled={creatingDrawio}
          isDismissable={!creatingDrawio}
        >
          <FormField
            aria-label="图表名称"
            label="图表名称"
            name="drawioName"
            value={drawioName}
            onChange={(value) => {
              setDrawioName(value);
              setDrawioNameError('');
            }}
            errorMessage={drawioNameError}
            isRequired
          >
            <Input placeholder="请输入名称" autoFocus />
          </FormField>
        </AppFormDialog>
        <CreateSkillModal
          isOpen={skillModalOpen}
          onOpenChange={setSkillModalOpen}
          onSuccess={handleCreateSkillSuccess}
        />
      </>
    ),
    [
      creatingDrawio,
      currentNodeId,
      drawioModalOpen,
      drawioName,
      drawioNameError,
      existingFolderNames,
      groupId,
      handleCreateSkillSuccess,
      handleMarkdownFileChange,
      handleUploadSuccess,
      markdownFileInputRef,
      newFolderOpen,
      refresh,
      resourcePermissionTarget,
      runCreateDrawio,
      targetTagId,
      tagAccessPermissionTagId,
      tagMountPermissionTagId,
      skillModalOpen,
      uploadDocumentOpen,
      uploadMountTagId,
      uploadOpen,
    ]
  );

  const openNewFolder = useCallback(() => {
    setNewFolderOpen(true);
  }, []);

  const openUploadDocument = useCallback(() => {
    const nextMountTagId = resolveCurrentFolderTagId(currentNodeId, []) ?? targetTagId;
    if (nextMountTagId) {
      setUploadMountTagId(nextMountTagId);
    }
    setUploadDocumentOpen(true);
  }, [currentNodeId, targetTagId]);

  const openUploadToGroup = useCallback(() => {
    setUploadOpen(true);
  }, []);

  const openTagAccessPermission = useCallback((tagId: string) => {
    setTagAccessPermissionTagId(tagId);
  }, []);

  const openTagMountPermission = useCallback((tagId: string) => {
    setTagMountPermissionTagId(tagId);
  }, []);

  const openResourcePermission = useCallback((target: ResourcePermissionModalTarget) => {
    setResourcePermissionTarget(target);
  }, []);

  const handleCreateNote = useCallback(() => {
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
  }, [creatingNote, currentNodeId, groupId, openInWorkspace, runCreateNote, scope]);

  const handleOpenDrawioModal = useCallback(() => {
    if (creatingDrawio) return;
    setDrawioName('未命名图表');
    setDrawioNameError('');
    setDrawioModalOpen(true);
  }, [creatingDrawio]);

  const handleOpenSkillModal = useCallback(() => {
    setSkillModalOpen(true);
  }, []);

  const handleCreateMenuSelect = useCallback(
    (id: CreateMenuItem['id']) => {
      switch (id) {
        case 'folder':
          openNewFolder();
          break;
        case 'note':
          handleCreateNote();
          break;
        case 'importNote':
          openMarkdownFilePicker();
          break;
        case 'drawio':
          handleOpenDrawioModal();
          break;
        case 'skill':
          handleOpenSkillModal();
          break;
        case 'upload':
          openUploadDocument();
          break;
      }
    },
    [
      handleCreateNote,
      handleOpenDrawioModal,
      handleOpenSkillModal,
      openNewFolder,
      openMarkdownFilePicker,
      openUploadDocument,
    ]
  );

  const showUploadDocument = Boolean(
    toolbarConfig.canUploadDocument && targetTagId && !isTrashView
  );

  const canCreateInCurrentFolder = Boolean(mountTagId);

  const showCreateMenu = Boolean(
    !isTrashView &&
    (toolbarConfig.canCreateFolder ||
      (canCreateInCurrentFolder &&
        (toolbarConfig.canCreateNote ||
          toolbarConfig.canCreateDrawio ||
          toolbarConfig.canCreateSkill ||
          showUploadDocument)))
  );

  const createMenuItems = useMemo<CreateMenuItem[]>(() => {
    if (!showCreateMenu) return [];
    const items: CreateMenuItem[] = [];
    if (toolbarConfig.canCreateFolder) {
      items.push({ id: 'folder', label: '新建文件夹' });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateDrawio) {
      items.push({ id: 'drawio', label: '新建图表', disabled: creatingDrawio });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateNote) {
      items.push({ id: 'note', label: '新建笔记', disabled: creatingNote });
      items.push({
        id: 'importNote',
        label: '导入笔记',
        disabled: importingMarkdownNote,
      });
    }
    if (canCreateInCurrentFolder && toolbarConfig.canCreateSkill) {
      items.push({ id: 'skill', label: '新建 Skill' });
    }
    if (showUploadDocument) {
      items.push({ id: 'upload', label: '上传文件' });
    }
    return items;
  }, [
    canCreateInCurrentFolder,
    creatingDrawio,
    creatingNote,
    importingMarkdownNote,
    showCreateMenu,
    showUploadDocument,
    toolbarConfig.canCreateDrawio,
    toolbarConfig.canCreateFolder,
    toolbarConfig.canCreateNote,
    toolbarConfig.canCreateSkill,
  ]);

  return {
    showCreateMenu,
    showUploadToGroup: Boolean(toolbarConfig.canUploadToGroup && groupId),
    showManagePermission: Boolean(toolbarConfig.canManageTagPermission && groupId),
    createMenuItems,
    handleCreateMenuSelect,
    openUploadToGroup,
    openTagAccessPermission,
    openTagMountPermission,
    openResourcePermission,
    tagPermissionRefreshToken,
    resourcePermissionRefreshToken,
    ModalHost,
  };
}
