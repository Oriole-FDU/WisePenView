import { useCallback, useReducer } from 'react';

import type { SkillDetail, SkillFileNode } from '@/domains/Skill';

import {
  applySavedSkillFiles,
  applySkillMove,
  type ApplySkillMoveOptions,
  buildSkillFileSaveSnapshots,
  collectDirtySkillNodeIds,
  collectSkillFileKeys,
  createEmptySkillWorkspaceState,
  createInitialSkillWorkspaceState,
  createSkillWorkspaceResourceKey,
  finishFailedSkillFileSave,
  getFileDraftByFileId,
  getSkillFileContent,
  getSkillFileEditorKey,
  registerLocalSkillFileDrafts,
  removeSkillWorkspaceNodes,
  type SkillConfigSaveSnapshot,
  type SkillFileSaveSnapshot,
  type SkillWorkspaceDraftState,
  type SkillWorkspacePendingIntent,
  updateLoadedSkillFileContent,
} from '../models/workspaceDraft';
import {
  canPreviewSkillFile,
  findFile,
  getFirstFile,
  isLocalAssetId,
} from '../utils/skillFileTree';
import { useSkillWorkspaceCacheController } from './useSkillWorkspaceCacheController';

type WorkspaceAction =
  | { type: 'replace'; state: SkillWorkspaceDraftState }
  | { type: 'update'; update: (state: SkillWorkspaceDraftState) => SkillWorkspaceDraftState };

function workspaceReducer(
  state: SkillWorkspaceDraftState,
  action: WorkspaceAction
): SkillWorkspaceDraftState {
  return action.type === 'replace' ? action.state : action.update(state);
}

export function useSkillWorkspaceDraftController(skill?: SkillDetail, accountId?: string) {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, createEmptySkillWorkspaceState);
  const normalizedAccountId = accountId?.trim() ?? '';
  const resourceKey =
    skill && normalizedAccountId
      ? `${normalizedAccountId}:${createSkillWorkspaceResourceKey(skill)}`
      : '';

  const skillResourceId = skill?.resourceId ?? '';
  const skillDraftVersion = skill?.draftVersion ?? 0;

  if (skill && normalizedAccountId && state.resourceKey !== resourceKey) {
    const initialState = { ...createInitialSkillWorkspaceState(skill), resourceKey };
    dispatch({ type: 'replace', state: initialState });
  }

  const update = (updater: (current: SkillWorkspaceDraftState) => SkillWorkspaceDraftState) => {
    dispatch({ type: 'update', update: updater });
  };

  const isConfigDirty = state.configDirty;
  const dirtyFileIds = new Set(Object.values(state.fileDrafts).map((draft) => draft.fileId));
  const hasFileDrafts = dirtyFileIds.size > 0;
  const hasUnsavedChanges = hasFileDrafts || isConfigDirty;

  /**
   * @wisepen-manual-memo
   * 为什么：缓存恢复需要按当前资源作用域重建工作区状态。
   * 收益：保持缓存 Controller 的恢复回调稳定，避免重复读取 IndexedDB。
   * 失效条件：工作区 reducer 的 dispatch 引用发生变化。
   */
  const restoreCachedWorkspace = useCallback(
    (workspace: SkillWorkspaceDraftState) => {
      dispatch({
        type: 'replace',
        state: {
          ...workspace,
          resourceKey,
          savingFileRevisions: {},
          savingConfigRevision: null,
          configDirty:
            workspace.configDirty ??
            (workspace.configName !== workspace.savedConfigName ||
              workspace.configDescription !== workspace.savedConfigDescription),
          pendingIntent: null,
        },
      });
    },
    [resourceKey]
  );

  const { clearDraftCache } = useSkillWorkspaceCacheController({
    accountId: normalizedAccountId,
    resourceKey,
    resourceId: skillResourceId,
    draftVersion: skillDraftVersion,
    state,
    hasUnsavedChanges,
    onRestore: restoreCachedWorkspace,
  });

  const selectedFile = state.selectedFileId ? findFile(state.files, state.selectedFileId) : null;
  const activeContent = getSkillFileContent(selectedFile, state.fileDrafts);
  const activeEditorKey = getSkillFileEditorKey(selectedFile, state.fileKeys);
  const dirtyNodeIds = collectDirtySkillNodeIds(state.files, dirtyFileIds);

  const selectTreeNode = (nodeId: string) => {
    update((current) => {
      const node = findFile(current.files, nodeId);
      if (!node) return current;
      return {
        ...current,
        selectedTreeNodeId: nodeId,
        selectedFileId: node.kind === 'file' ? nodeId : current.selectedFileId,
      };
    });
  };

  const selectConfig = (configNodeId: string) => {
    update((current) => ({ ...current, selectedTreeNodeId: configNodeId, selectedFileId: '' }));
  };

  const clearSelection = () => {
    update((current) => ({ ...current, selectedTreeNodeId: '', selectedFileId: '' }));
  };

  const updateFileContent = (fileId: string, content: string) => {
    update((current) => {
      const file = findFile(current.files, fileId);
      if (!file || !canPreviewSkillFile(file)) return current;
      const editorKey = current.fileKeys[fileId] ?? fileId;
      const fileDrafts = { ...current.fileDrafts };
      if (!isLocalAssetId(fileId) && content === (file.content ?? '')) {
        if (current.savingFileRevisions[editorKey] == null) {
          delete fileDrafts[editorKey];
          return { ...current, fileDrafts };
        }
      }
      fileDrafts[editorKey] = {
        editorKey,
        fileId,
        revision: current.nextRevision,
        content,
      };
      return { ...current, fileDrafts, nextRevision: current.nextRevision + 1 };
    });
  };

  const addLocalFiles = (
    files: SkillFileNode[],
    addedFiles: SkillFileNode[],
    selectedFileId?: string
  ) => {
    update((current) => {
      const next = { ...current, files };
      const registered = registerLocalSkillFileDrafts(next, addedFiles);
      return {
        ...next,
        ...registered,
        selectedFileId: selectedFileId ?? current.selectedFileId,
        selectedTreeNodeId: selectedFileId ?? current.selectedTreeNodeId,
        editing: selectedFileId ? true : current.editing,
      };
    });
  };

  const addLocalFolder = (files: SkillFileNode[], selectedFolderId: string) => {
    update((current) => ({ ...current, files, selectedTreeNodeId: selectedFolderId }));
  };

  const applyMove = (options: ApplySkillMoveOptions) => {
    update((current) => applySkillMove(current, options));
  };

  const removeNodes = (removeIds: Set<string>) => {
    update((current) => removeSkillWorkspaceNodes(current, removeIds));
  };

  const applyLoadedContent = (fileId: string, content: string) => {
    update((current) => updateLoadedSkillFileContent(current, fileId, content));
  };

  const markFileSaveStarted = (snapshots: SkillFileSaveSnapshot[]) => {
    update((current) => ({
      ...current,
      savingFileRevisions: {
        ...current.savingFileRevisions,
        ...Object.fromEntries(snapshots.map((snapshot) => [snapshot.editorKey, snapshot.revision])),
      },
    }));
  };

  const applyFileSaveResults = (
    snapshots: SkillFileSaveSnapshot[],
    results: Parameters<typeof applySavedSkillFiles>[2]
  ) => {
    update((current) => applySavedSkillFiles(current, snapshots, results));
  };

  const applyFileSaveFailure = (snapshots: SkillFileSaveSnapshot[]) => {
    update((current) => finishFailedSkillFileSave(current, snapshots));
  };

  const markConfigSaveStarted = (snapshot: SkillConfigSaveSnapshot) => {
    update((current) => ({ ...current, savingConfigRevision: snapshot.revision }));
  };

  const applyConfigSave = (snapshot: SkillConfigSaveSnapshot) => {
    update((current) => {
      const configName =
        current.configRevision === snapshot.revision ? snapshot.name : current.configName;
      const configDescription =
        current.configRevision === snapshot.revision
          ? snapshot.description
          : current.configDescription;
      return {
        ...current,
        configName,
        configDescription,
        savedConfigName: snapshot.name,
        savedConfigDescription: snapshot.description,
        configDirty: configName !== snapshot.name || configDescription !== snapshot.description,
        savingConfigRevision: null,
      };
    });
  };

  const applyConfigSaveFailure = () => {
    update((current) => ({
      ...current,
      configDirty:
        current.configName !== current.savedConfigName ||
        current.configDescription !== current.savedConfigDescription,
      savingConfigRevision: null,
    }));
  };

  const updateConfigName = (name: string) => {
    update((current) => ({
      ...current,
      configName: name,
      configRevision: current.configRevision + 1,
      configDirty:
        current.savingConfigRevision != null ||
        name !== current.savedConfigName ||
        current.configDescription !== current.savedConfigDescription,
    }));
  };

  const updateConfigDescription = (description: string) => {
    update((current) => ({
      ...current,
      configDescription: description,
      configRevision: current.configRevision + 1,
      configDirty:
        current.savingConfigRevision != null ||
        current.configName !== current.savedConfigName ||
        description !== current.savedConfigDescription,
    }));
  };

  const resetConfig = () => {
    update((current) => ({
      ...current,
      configName: current.savedConfigName,
      configDescription: current.savedConfigDescription,
      configRevision: current.configRevision + 1,
      configDirty: false,
    }));
  };

  const setPendingIntent = (pendingIntent: SkillWorkspacePendingIntent) => {
    update((current) => ({ ...current, pendingIntent }));
  };

  const setEditing = (editing: boolean) => {
    update((current) => ({ ...current, editing }));
  };

  const discardAll = () => {
    update((current) => ({
      ...current,
      files: current.persistedFiles,
      fileDrafts: {},
      savingFileRevisions: {},
      fileKeys: Object.fromEntries(
        Object.entries(current.fileKeys).filter(([id]) =>
          Boolean(findFile(current.persistedFiles, id))
        )
      ),
      selectedFileId: findFile(current.persistedFiles, current.selectedFileId)
        ? current.selectedFileId
        : '',
      selectedTreeNodeId: findFile(current.persistedFiles, current.selectedTreeNodeId)
        ? current.selectedTreeNodeId
        : '',
      configName: current.savedConfigName,
      configDescription: current.savedConfigDescription,
      configDirty: false,
      savingConfigRevision: null,
      editing: false,
      pendingIntent: null,
    }));
  };

  const replaceVersion = (files: SkillFileNode[], viewingVersion: number) => {
    const firstFileId = getFirstFile(files)?.id ?? '';
    update((current) => ({
      ...current,
      files,
      persistedFiles: files,
      fileDrafts: {},
      savingFileRevisions: {},
      fileKeys: collectSkillFileKeys(files),
      selectedFileId: firstFileId,
      selectedTreeNodeId: firstFileId,
      viewingVersion,
      editing: false,
      pendingIntent: null,
    }));
  };

  const fileSaveSnapshots = buildSkillFileSaveSnapshots(state.files, state.fileDrafts);
  const activeFileSaveSnapshots = selectedFile
    ? buildSkillFileSaveSnapshots(state.files, state.fileDrafts, new Set([selectedFile.id]))
    : [];
  const configSaveSnapshot: SkillConfigSaveSnapshot | null = isConfigDirty
    ? {
        revision: state.configRevision,
        name: state.configName.trim(),
        description: state.configDescription.trim(),
      }
    : null;

  return {
    state,
    selectedFile,
    activeContent,
    activeEditorKey,
    dirtyFileIds,
    dirtyNodeIds,
    isConfigDirty,
    hasFileDrafts,
    hasUnsavedChanges,
    fileSaveSnapshots,
    activeFileSaveSnapshots,
    configSaveSnapshot,
    selectTreeNode,
    selectConfig,
    clearSelection,
    updateFileContent,
    addLocalFiles,
    addLocalFolder,
    applyMove,
    removeNodes,
    applyLoadedContent,
    markFileSaveStarted,
    applyFileSaveResults,
    applyFileSaveFailure,
    markConfigSaveStarted,
    applyConfigSave,
    applyConfigSaveFailure,
    updateConfigName,
    updateConfigDescription,
    resetConfig,
    setPendingIntent,
    setEditing,
    discardAll,
    replaceVersion,
    clearDraftCache,
    getFileSaveSnapshots: (fileIds: Set<string>) =>
      buildSkillFileSaveSnapshots(state.files, state.fileDrafts, fileIds),
    getFileDraft: (fileId: string) => getFileDraftByFileId(state.fileDrafts, fileId),
  };
}
