import type {
  SkillFileDropPosition,
  SkillPendingCreate,
} from '@/components/Skill/SkillFileTree/index.type';
import type { ISkillService, SkillDetail, SkillFileNode } from '@/domains/Skill';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  appendFileNodeByPath,
  appendTreeNode,
  canPreviewSkillFile,
  collectExpandedKeys,
  collectFileIds,
  createLocalFileNode,
  createLocalFolderNode,
  findFile,
  findFileByPathAndName,
  isEditableSkillFileName,
  isRemoteAssetId,
  isSkillZipFile,
  MAIN_SKILL_FILE_NAME,
  moveTreeNode,
  normalizeDirectoryPath,
  remapTreeNodes,
  removeTreeNode,
  ROOT_PATH,
  updateTreeFileContent,
} from '../utils/skillFileTree';
import { parseSkillZip } from '../utils/skillZip';
import type { SkillEditorActions, SkillEditorState } from './useSkillEditorController';

interface RestoredEditorDraft {
  editorContent: string;
  savedContent: string;
}

interface UseSkillFileTreeOptions {
  actions: SkillEditorActions;
  canEdit: boolean;
  consumeRestoredEditorDraft: (fileId: string) => RestoredEditorDraft | null;
  isConfigDirty: boolean;
  isConfigSelected: boolean;
  isDirty: boolean;
  isSaveQueueActive: boolean;
  refreshSkill: () => void;
  saveLoading: boolean;
  selectedFile: SkillFileNode | null;
  skill?: SkillDetail;
  skillService: ISkillService;
  state: SkillEditorState;
}

export function useSkillFileTree({
  actions,
  canEdit,
  consumeRestoredEditorDraft,
  isConfigDirty,
  isConfigSelected,
  isDirty,
  isSaveQueueActive,
  refreshSkill,
  saveLoading,
  selectedFile,
  skill,
  skillService,
  state,
}: UseSkillFileTreeOptions) {
  const { t } = useTranslation('skill');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingCreate, setPendingCreate] = useState<SkillPendingCreate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkillFileNode | null>(null);
  const [isTreeDragOver, setIsTreeDragOver] = useState(false);
  const [interactionResourceId, setInteractionResourceId] = useState(skill?.resourceId);
  const { files, selectedFileId, selectedTreeNodeId, viewingVersion } = state;
  const {
    setEditing,
    setEditorContent,
    setFiles,
    setPendingIntent,
    setSavedContent,
    setSaveQueueItems,
    setSelectedFileId,
    setSelectedTreeNodeId,
  } = actions;
  const selectedTreeNode = selectedTreeNodeId ? findFile(files, selectedTreeNodeId) : null;
  const expandedKeys = collectExpandedKeys(files);
  const cancelPendingCreate = () => setPendingCreate(null);

  if (interactionResourceId !== skill?.resourceId) {
    setInteractionResourceId(skill?.resourceId);
    setPendingCreate(null);
    setDeleteTarget(null);
    setIsTreeDragOver(false);
  }

  const { loading: contentLoading, run: runLoadFileContent } = useRequest(
    async (file: SkillFileNode) => {
      if (!skill?.resourceId || !file.objectKey) return null;
      const content = await skillService.loadAssetContent(
        skill.resourceId,
        file.objectKey,
        viewingVersion ?? undefined
      );
      return { fileId: file.id, content };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setFiles((current) => updateTreeFileContent(current, result.fileId, result.content));
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  /**
   * @wisepen-manual-effect
   * 执行时机：文件选择、版本或异步加载入口变化时同步编辑器内容，并按需请求远端文件。
   * 不可替代原因：文件正文来自异步 Skill service，加载结果还需写回编辑器控制器。
   * cleanup：请求竞态由 useRequest 管理，本层没有额外订阅需要清理。
   */
  useEffect(() => {
    const canPreviewCurrentFile = selectedFile ? canPreviewSkillFile(selectedFile) : true;
    const content = selectedFile?.content ?? '';
    if (selectedFileId && !selectedFile) setSelectedFileId('');
    const restoredEditorDraft = selectedFile ? consumeRestoredEditorDraft(selectedFile.id) : null;
    if (restoredEditorDraft && canPreviewCurrentFile) {
      setEditorContent(restoredEditorDraft.editorContent);
      setSavedContent(restoredEditorDraft.savedContent);
    } else {
      setEditorContent(canPreviewCurrentFile ? content : '');
      setSavedContent(canPreviewCurrentFile ? content : '');
    }
    if (
      selectedFile &&
      canPreviewCurrentFile &&
      selectedFile.content === undefined &&
      selectedFile.objectKey
    ) {
      runLoadFileContent(selectedFile);
    }
  }, [
    consumeRestoredEditorDraft,
    runLoadFileContent,
    selectedFile,
    selectedFileId,
    setEditorContent,
    setSavedContent,
    setSelectedFileId,
    viewingVersion,
  ]);

  const resolveCreateParent = () => {
    const node = selectedTreeNode ?? (selectedFileId ? selectedFile : null);
    if (!node) return { parentFolderId: undefined, parentPath: ROOT_PATH };
    if (node.kind === 'folder') {
      return { parentFolderId: node.id, parentPath: normalizeDirectoryPath(node.path) };
    }
    const filePath = normalizeDirectoryPath(node.path);
    return {
      parentFolderId: filePath === ROOT_PATH ? undefined : `folder:${filePath}`,
      parentPath: filePath,
    };
  };

  const applyTreeSelection = (nodeId: string) => {
    const node = findFile(files, nodeId);
    if (!node) return;
    setSelectedTreeNodeId(nodeId);
    if (node.kind === 'file') setSelectedFileId(nodeId);
  };

  const selectNewLocalFile = (fileId: string) => {
    if (isDirty) {
      setPendingIntent({ type: 'switchFile', fileId });
      return;
    }
    setSelectedFileId(fileId);
    setSelectedTreeNodeId(fileId);
    setEditing(true);
  };

  const { loading: moveLoading, run: handleMoveFile } = useRequest(
    async ({
      dragId,
      dropId,
      dropPosition,
    }: {
      dragId: string;
      dropId: string;
      dropPosition: SkillFileDropPosition;
    }) => {
      if (!skill || !canEdit) return null;
      if (isSaveQueueActive) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_SAVE_IN_PROGRESS);
      }
      if (isDirty) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_UNSAVED_MOVE_BLOCKED);
      }

      const moveResult = moveTreeNode(files, dragId, dropId, dropPosition);
      if (!moveResult) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_MOVE_CONFLICT);
      }
      const idMap = new Map(moveResult.idMap);
      const remotePathMoves = moveResult.movedFiles.filter(
        ({ previous, next }) => previous.path !== next.path && isRemoteAssetId(previous.id)
      );

      const movedAssets = await skillService.moveAssets(
        skill.resourceId,
        skill.draftVersion,
        remotePathMoves.map(({ previous, next }) => ({
          assetId: previous.id,
          objectKey: previous.objectKey,
          name: next.name,
          path: next.path,
          content: previous.content ?? previous.contentBlob,
        }))
      );
      const objectKeyMap = new Map<string, string>();
      movedAssets.forEach(({ previousAssetId, assetId, objectKey }) => {
        idMap.set(previousAssetId, assetId);
        objectKeyMap.set(previousAssetId, objectKey);
      });
      return { moveResult, idMap, objectKeyMap };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setFiles(remapTreeNodes(result.moveResult.files, result.idMap, result.objectKeyMap));
        if (result.idMap.size > 0) {
          setSelectedFileId((current) => result.idMap.get(current) ?? current);
          setSelectedTreeNodeId((current) => result.idMap.get(current) ?? current);
        }
        toast.success(t('toast.moveSuccess'));
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const canEditTree = canEdit && !moveLoading && !saveLoading && !isSaveQueueActive;

  const handleStartCreate = (kind: 'file' | 'folder') => {
    const { parentFolderId } = resolveCreateParent();
    setPendingCreate({ kind, parentFolderId });
  };

  const handleCommitCreate = (name: string, kind: 'file' | 'folder') => {
    if (!canEdit) {
      setPendingCreate(null);
      return;
    }
    const parentFolder = pendingCreate?.parentFolderId
      ? findFile(files, pendingCreate.parentFolderId)
      : null;
    const parentPath = parentFolder?.kind === 'folder' ? parentFolder.path : ROOT_PATH;

    if (kind === 'folder') {
      const folder = createLocalFolderNode(name, parentPath);
      setFiles((current) => appendTreeNode(current, pendingCreate?.parentFolderId, folder));
      setSelectedTreeNodeId(folder.id);
    } else {
      const file = createLocalFileNode(name, parentPath);
      setFiles((current) => appendTreeNode(current, pendingCreate?.parentFolderId, file));
      selectNewLocalFile(file.id);
    }
    setPendingCreate(null);
  };

  const handleAddLocalFiles = async (localFiles: File[]) => {
    if (!canEditTree || localFiles.length === 0) return;
    if (isDirty) {
      toast.warning(t('toast.saveBeforeUpload'));
      return;
    }

    const zipFiles = localFiles.filter(isSkillZipFile);
    if (zipFiles.length > 0) {
      if (localFiles.length > 1 || zipFiles.length > 1) {
        toast.warning(t('toast.uploadSingleZip'));
        return;
      }
      try {
        const parsedFiles = await parseSkillZip(zipFiles[0], {
          mainSkillFileName: MAIN_SKILL_FILE_NAME,
        });
        const conflicts = parsedFiles.filter((file) =>
          findFileByPathAndName(files, file.path, file.name)
        );
        if (conflicts.length > 0) {
          throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_ZIP_IMPORT_CONFLICT, {
            fileNames: conflicts
              .slice(0, 3)
              .map((file) => file.name)
              .join('、'),
          });
        }

        const nextFiles = parsedFiles.map((file) => ({
          ...createLocalFileNode(file.name, file.path),
          content: file.content,
          contentBlob: file.contentBlob,
          size: file.size,
        }));
        setFiles((current) =>
          nextFiles.reduce((tree, fileNode) => appendFileNodeByPath(tree, fileNode), current)
        );
        const mainFile = nextFiles.find(
          (file) =>
            file.name === MAIN_SKILL_FILE_NAME && normalizeDirectoryPath(file.path) === ROOT_PATH
        );
        const selectedZipFile = mainFile ?? nextFiles[0];
        if (selectedZipFile) {
          setSelectedFileId(selectedZipFile.id);
          setSelectedTreeNodeId(selectedZipFile.id);
          setEditing(false);
        }
        toast.success(t('toast.zipImported'));
      } catch (error) {
        toast.danger(parseErrorMessage(error));
      }
      return;
    }

    try {
      const { parentFolderId, parentPath } = resolveCreateParent();
      const nextFiles: SkillFileNode[] = [];
      for (const file of localFiles) {
        const canPreviewUploadedFile = isEditableSkillFileName(file.name);
        nextFiles.push({
          ...createLocalFileNode(file.name, parentPath),
          content: canPreviewUploadedFile ? await file.text() : undefined,
          contentBlob: canPreviewUploadedFile ? undefined : file,
          size: file.size,
        });
      }
      setFiles((current) =>
        nextFiles.reduce(
          (tree, fileNode) => appendTreeNode(tree, parentFolderId, fileNode),
          current
        )
      );
      const lastFile = nextFiles.at(-1);
      if (lastFile) {
        setSelectedFileId(lastFile.id);
        setSelectedTreeNodeId(lastFile.id);
        setEditing(false);
      }
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await handleAddLocalFiles(Array.from(event.target.files ?? []));
    } finally {
      event.target.value = '';
    }
  };

  const handleTreeDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = canEditTree ? 'copy' : 'none';
    if (canEditTree) setIsTreeDragOver(true);
  };

  const handleTreeDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setIsTreeDragOver(false);
    }
  };

  const handleTreeDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    setIsTreeDragOver(false);
    if (canEditTree) void handleAddLocalFiles(Array.from(event.dataTransfer.files));
  };

  const handleTreeWrapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest('.wisepen-tree__item')) return;
    if (isSaveQueueActive) {
      toast.warning(t('toast.savingClearSelection'));
      return;
    }
    if (isDirty) {
      toast.warning(t('toast.saveBeforeClearSelection'));
      return;
    }
    if (isConfigSelected && isConfigDirty) {
      toast.warning(t('toast.updateConfigBeforeClearSelection'));
      return;
    }
    setSelectedTreeNodeId('');
    setSelectedFileId('');
  };

  const { loading: deleteLoading, run: deleteFile } = useRequest(
    async (target: SkillFileNode) => {
      if (!skill) return null;
      const ids = collectFileIds(target);
      const remoteAssetIds = ids.filter(isRemoteAssetId);
      await skillService.deleteAssets(skill.resourceId, skill.draftVersion, remoteAssetIds);
      return { target, ids };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        const removeIds = new Set<string>([result.target.id, ...result.ids]);
        setFiles((current) => removeTreeNode(current, removeIds));
        setSaveQueueItems((current) => current.filter((item) => !removeIds.has(item.id)));
        if (removeIds.has(selectedFileId)) setSelectedFileId('');
        if (removeIds.has(selectedTreeNodeId)) setSelectedTreeNodeId('');
        setDeleteTarget(null);
        toast.success(t('toast.deleteSuccess'));
        refreshSkill();
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const handleDeleteFile = (fileId: string) => {
    setDeleteTarget(findFile(files, fileId));
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) deleteFile(deleteTarget);
  };

  return {
    applyTreeSelection,
    canEditTree,
    cancelPendingCreate,
    contentLoading,
    deleteLoading,
    deleteTarget,
    expandedKeys,
    fileInputRef,
    handleCommitCreate,
    handleConfirmDelete,
    handleDeleteFile,
    handleFileChange,
    handleMoveFile,
    handleStartCreate,
    handleTreeDragLeave,
    handleTreeDragOver,
    handleTreeDrop,
    handleTreeWrapClick,
    isTreeDragOver,
    moveLoading,
    pendingCreate,
    setDeleteTarget,
  };
}
