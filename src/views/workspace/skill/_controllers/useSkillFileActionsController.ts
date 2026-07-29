import type {
  SkillFileDropPosition,
  SkillPendingCreate,
} from '@/components/Skill/SkillFileTree/index.type';
import { useSkillService } from '@/domains';
import type { SkillDetail, SkillFileNode } from '@/domains/Skill';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  ApplySkillMoveOptions,
  SkillFileDraft,
  SkillFileSaveSnapshot,
} from '../_models/workspaceDraft';
import {
  appendFileNodeByPath,
  appendTreeNode,
  canPreviewSkillFile,
  collectExpandedKeys,
  collectFileIds,
  collectNodeIds,
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
  ROOT_PATH,
  type MoveTreeNodeResult,
} from '../utils/skillFileTree';
import { parseSkillZip } from '../utils/skillZip';

interface PendingSkillMove {
  moveResult: MoveTreeNodeResult;
  remotePathMoves: MoveTreeNodeResult['movedFiles'];
  dirtyRemoteFileIds: Set<string>;
}

interface UseSkillFileActionsControllerOptions {
  applyLoadedContent: (fileId: string, content: string) => void;
  applyMove: (options: ApplySkillMoveOptions) => void;
  canEdit: boolean;
  dirtyFileIds: Set<string>;
  files: SkillFileNode[];
  getFileDraft: (fileId: string) => SkillFileDraft | null;
  getFileSaveSnapshots: (fileIds: Set<string>) => SkillFileSaveSnapshot[];
  isSaving: boolean;
  onLocalFilesAdded: (
    files: SkillFileNode[],
    addedFiles: SkillFileNode[],
    selectedFileId?: string
  ) => void;
  onLocalFolderAdded: (files: SkillFileNode[], selectedFolderId: string) => void;
  onMoveSaveFailed: (snapshots: SkillFileSaveSnapshot[]) => void;
  onMoveSaveStarted: (snapshots: SkillFileSaveSnapshot[]) => void;
  onNodesDeleted: (removeIds: Set<string>) => void;
  onPersistedMutation: () => void;
  onQueueItemsRemoved: (editorKeys: Set<string>) => void;
  onSelectionCleared: () => void;
  onTreeNodeSelected: (nodeId: string) => void;
  selectedFile: SkillFileNode | null;
  selectedFileId: string;
  selectedTreeNodeId: string;
  skill?: SkillDetail;
  viewingVersion: number | null;
}

export function useSkillFileActionsController({
  applyLoadedContent,
  applyMove,
  canEdit,
  dirtyFileIds,
  files,
  getFileDraft,
  getFileSaveSnapshots,
  isSaving,
  onLocalFilesAdded,
  onLocalFolderAdded,
  onMoveSaveFailed,
  onMoveSaveStarted,
  onNodesDeleted,
  onPersistedMutation,
  onQueueItemsRemoved,
  onSelectionCleared,
  onTreeNodeSelected,
  selectedFile,
  selectedFileId,
  selectedTreeNodeId,
  skill,
  viewingVersion,
}: UseSkillFileActionsControllerOptions) {
  const { t } = useTranslation('skill');
  const skillService = useSkillService();
  const [pendingCreate, setPendingCreate] = useState<SkillPendingCreate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkillFileNode | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingSkillMove | null>(null);
  const [isTreeDragOver, setIsTreeDragOver] = useState(false);
  const [interactionResourceId, setInteractionResourceId] = useState(skill?.resourceId);

  if (interactionResourceId !== skill?.resourceId) {
    setInteractionResourceId(skill?.resourceId);
    setPendingCreate(null);
    setDeleteTarget(null);
    setPendingMove(null);
    setIsTreeDragOver(false);
  }

  const expandedKeys = collectExpandedKeys(files);
  const selectedTreeNode = selectedTreeNodeId ? findFile(files, selectedTreeNodeId) : null;
  const cancelPendingCreate = () => setPendingCreate(null);

  const { loading: contentLoading, run: loadFileContent } = useRequest(
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
        if (result) applyLoadedContent(result.fileId, result.content);
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  /**
   * @wisepen-manual-effect
   * 执行时机：选中可编辑远端文件且尚未加载正文时请求内容。
   * 不可替代原因：文件正文来自异步 Skill service，结果需要写回工作区基线。
   * cleanup：请求竞态由 useRequest 管理，本层没有额外订阅需要清理。
   */
  useEffect(() => {
    if (
      selectedFile &&
      canPreviewSkillFile(selectedFile) &&
      selectedFile.content === undefined &&
      selectedFile.objectKey
    ) {
      loadFileContent(selectedFile);
    }
  }, [loadFileContent, selectedFile]);

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

  const { loading: moveLoading, runAsync: executeMove } = useRequest(
    async (
      move: PendingSkillMove,
      savedSnapshots: SkillFileSaveSnapshot[] = []
    ): Promise<ApplySkillMoveOptions> => {
      if (!skill) {
        return { files: move.moveResult.files, idMap: move.moveResult.idMap, persist: false };
      }
      if (move.remotePathMoves.length === 0) {
        return { files: move.moveResult.files, idMap: move.moveResult.idMap, persist: false };
      }
      const snapshotByFileId = new Map(
        savedSnapshots.map((snapshot) => [snapshot.fileId, snapshot])
      );
      const movedAssets = await skillService.moveAssets(
        skill.resourceId,
        skill.draftVersion,
        move.remotePathMoves.map(({ previous, next }) => ({
          assetId: previous.id,
          objectKey: previous.objectKey,
          name: next.name,
          path: next.path,
          content:
            snapshotByFileId.get(previous.id)?.content ?? previous.content ?? previous.contentBlob,
        }))
      );
      const idMap = new Map(move.moveResult.idMap);
      const objectKeyMap = new Map<string, string>();
      movedAssets.forEach(({ previousAssetId, assetId, objectKey }) => {
        idMap.set(previousAssetId, assetId);
        objectKeyMap.set(previousAssetId, objectKey);
      });
      return {
        files: move.moveResult.files,
        idMap,
        objectKeyMap,
        savedSnapshots,
        persist: true,
      };
    },
    {
      manual: true,
      onSuccess: (result) => {
        applyMove(result);
        if (result.persist) onPersistedMutation();
        setPendingMove(null);
        toast.success(t('toast.moveSuccess'));
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const canEditTree = canEdit && !isSaving && !moveLoading;

  const handleMoveFile = ({
    dragId,
    dropId,
    dropPosition,
  }: {
    dragId: string;
    dropId: string;
    dropPosition: SkillFileDropPosition;
  }) => {
    if (!skill || !canEditTree) return;
    const moveResult = moveTreeNode(files, dragId, dropId, dropPosition);
    if (!moveResult) {
      toast.danger(parseErrorMessage(createClientError(FRONTEND_CLIENT_ERROR.SKILL_MOVE_CONFLICT)));
      return;
    }
    const remotePathMoves = moveResult.movedFiles.filter(
      ({ previous, next }) => previous.path !== next.path && isRemoteAssetId(previous.id)
    );
    const dirtyRemoteFileIds = new Set(
      remotePathMoves
        .map(({ previous }) => previous.id)
        .filter((fileId) => dirtyFileIds.has(fileId))
    );
    const move = { moveResult, remotePathMoves, dirtyRemoteFileIds };
    if (dirtyRemoteFileIds.size > 0) {
      setPendingMove(move);
      return;
    }
    void executeMove(move, []).catch(() => undefined);
  };

  const handleConfirmMove = () => {
    if (!pendingMove) return;
    const snapshots = getFileSaveSnapshots(pendingMove.dirtyRemoteFileIds);
    onMoveSaveStarted(snapshots);
    void executeMove(pendingMove, snapshots).catch(() => onMoveSaveFailed(snapshots));
  };

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
      onLocalFolderAdded(appendTreeNode(files, pendingCreate?.parentFolderId, folder), folder.id);
    } else {
      const file = createLocalFileNode(name, parentPath);
      onLocalFilesAdded(
        appendTreeNode(files, pendingCreate?.parentFolderId, file),
        [file],
        file.id
      );
    }
    setPendingCreate(null);
  };

  const handleAddLocalFiles = async (localFiles: File[]) => {
    if (!canEditTree || localFiles.length === 0) return;
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
        const nextTree = nextFiles.reduce(
          (tree, fileNode) => appendFileNodeByPath(tree, fileNode),
          files
        );
        const mainFile = nextFiles.find(
          (file) =>
            file.name === MAIN_SKILL_FILE_NAME && normalizeDirectoryPath(file.path) === ROOT_PATH
        );
        onLocalFilesAdded(nextTree, nextFiles, (mainFile ?? nextFiles[0])?.id);
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
      const nextTree = nextFiles.reduce(
        (tree, fileNode) => appendTreeNode(tree, parentFolderId, fileNode),
        files
      );
      onLocalFilesAdded(nextTree, nextFiles, nextFiles.at(-1)?.id);
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
    onSelectionCleared();
  };

  const handleTreeSelect = (nodeId: string) => {
    cancelPendingCreate();
    onTreeNodeSelected(nodeId);
  };

  const { loading: deleteLoading, run: deleteFile } = useRequest(
    async (target: SkillFileNode) => {
      if (!skill) return null;
      const fileIds = collectFileIds(target);
      const remoteAssetIds = fileIds.filter(isRemoteAssetId);
      await skillService.deleteAssets(skill.resourceId, skill.draftVersion, remoteAssetIds);
      return {
        removeIds: new Set([target.id, ...collectNodeIds(target)]),
        editorKeys: new Set(
          fileIds.map((fileId) => getFileDraft(fileId)?.editorKey).filter(Boolean) as string[]
        ),
      };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        onNodesDeleted(result.removeIds);
        onQueueItemsRemoved(result.editorKeys);
        onPersistedMutation();
        setDeleteTarget(null);
        toast.success(t('toast.deleteSuccess'));
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const handleDeleteFile = (fileId: string) => setDeleteTarget(findFile(files, fileId));
  const handleConfirmDelete = () => {
    if (deleteTarget) deleteFile(deleteTarget);
  };
  const deleteDirtyCount = deleteTarget
    ? collectFileIds(deleteTarget).filter((fileId) => dirtyFileIds.has(fileId)).length
    : 0;

  return {
    canEditTree,
    cancelPendingCreate,
    contentLoading,
    deleteDirtyCount,
    deleteLoading,
    deleteTarget,
    expandedKeys,
    handleCommitCreate,
    handleConfirmDelete,
    handleConfirmMove,
    handleDeleteFile,
    handleFileChange,
    handleMoveFile,
    handleStartCreate,
    handleTreeDragLeave,
    handleTreeDragOver,
    handleTreeDrop,
    handleTreeSelect,
    handleTreeWrapClick,
    isTreeDragOver,
    moveLoading,
    pendingCreate,
    pendingMove,
    setDeleteTarget,
    setPendingMove,
  };
}
