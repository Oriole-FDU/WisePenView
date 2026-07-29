import type { SkillDetail, SkillFileNode } from '@/domains/Skill';
import i18n from '@/i18n';
import { toast } from '@heroui/react';
import { useEffect, useReducer, useRef, useState } from 'react';

import {
  applySavedSkillFiles,
  applySkillMove,
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
  updateLoadedSkillFileContent,
  type ApplySkillMoveOptions,
  type SkillConfigSaveSnapshot,
  type SkillFileSaveSnapshot,
  type SkillWorkspaceDraftState,
  type SkillWorkspacePendingIntent,
} from '../_models/workspaceDraft';
import {
  clearSkillDraftCache,
  loadSkillDraftCache,
  saveSkillDraftCache,
  type SkillDraftCacheSnapshot,
} from '../utils/skillDraftCache';
import {
  canPreviewSkillFile,
  findFile,
  getFirstFile,
  isLocalAssetId,
} from '../utils/skillFileTree';

type WorkspaceAction =
  | { type: 'replace'; state: SkillWorkspaceDraftState }
  | { type: 'update'; update: (state: SkillWorkspaceDraftState) => SkillWorkspaceDraftState };

function workspaceReducer(
  state: SkillWorkspaceDraftState,
  action: WorkspaceAction
): SkillWorkspaceDraftState {
  return action.type === 'replace' ? action.state : action.update(state);
}

function isMatchingCache(snapshot: SkillDraftCacheSnapshot, draftVersion: number): boolean {
  return snapshot.schemaVersion === 2 && snapshot.draftVersion === draftVersion;
}

export function useSkillWorkspaceDraftController(skill?: SkillDetail) {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, createEmptySkillWorkspaceState);
  const cacheWriteVersionRef = useRef(0);
  const resourceKey = skill ? createSkillWorkspaceResourceKey(skill) : '';
  const [cacheReadyKey, setCacheReadyKey] = useState<string | null>(null);

  const skillResourceId = skill?.resourceId ?? '';
  const skillDraftVersion = skill?.draftVersion ?? 0;

  if (skill && state.resourceKey !== resourceKey) {
    const initialState = createInitialSkillWorkspaceState(skill);
    dispatch({ type: 'replace', state: initialState });
  }

  const update = (updater: (current: SkillWorkspaceDraftState) => SkillWorkspaceDraftState) => {
    dispatch({ type: 'update', update: updater });
  };

  const invalidateCacheWrites = () => {
    cacheWriteVersionRef.current += 1;
  };

  const clearDraftCache = async () => {
    if (!skillResourceId) return;
    invalidateCacheWrites();
    await clearSkillDraftCache(skillResourceId).catch(() => undefined);
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：Skill 资源或草稿版本变化后读取对应的 IndexedDB 多文件草稿。
   * 不可替代原因：IndexedDB 是 React 外部异步存储，恢复结果必须与当前资源 key 校验后写入状态。
   * cleanup：废弃旧资源的异步读取，避免其覆盖新资源状态。
   */
  useEffect(() => {
    if (!skillResourceId || !skillDraftVersion || !resourceKey) return;
    let disposed = false;
    cacheWriteVersionRef.current += 1;
    void loadSkillDraftCache(skillResourceId)
      .then((snapshot) => {
        if (disposed) return;
        if (snapshot && isMatchingCache(snapshot, skillDraftVersion)) {
          const restoredState: SkillWorkspaceDraftState = {
            ...snapshot.workspace,
            resourceKey,
            savingFileRevisions: {},
            savingConfigRevision: null,
            configDirty:
              snapshot.workspace.configDirty ??
              (snapshot.workspace.configName !== snapshot.workspace.savedConfigName ||
                snapshot.workspace.configDescription !== snapshot.workspace.savedConfigDescription),
            pendingIntent: null,
          };
          dispatch({
            type: 'replace',
            state: restoredState,
          });
          toast.warning(i18n.t('toast.draftRestored', { ns: 'skill' }));
        } else if (snapshot) {
          void clearSkillDraftCache(skillResourceId);
        }
        setCacheReadyKey(resourceKey);
      })
      .catch(() => {
        if (!disposed) setCacheReadyKey(resourceKey);
      });
    return () => {
      disposed = true;
    };
  }, [resourceKey, skillDraftVersion, skillResourceId]);

  const isConfigDirty = state.configDirty;
  const dirtyFileIds = new Set(Object.values(state.fileDrafts).map((draft) => draft.fileId));
  const hasFileDrafts = dirtyFileIds.size > 0;
  const hasUnsavedChanges = hasFileDrafts || isConfigDirty;

  /**
   * @wisepen-manual-effect
   * 执行时机：多文件草稿、文件树或 Config 草稿变化后防抖写入 IndexedDB。
   * 不可替代原因：IndexedDB 与 Blob 持久化属于 React 外部异步存储。
   * cleanup：取消未开始的写入，并通过版本令牌废弃已失效任务。
   */
  useEffect(() => {
    if (
      !skillResourceId ||
      !skillDraftVersion ||
      cacheReadyKey !== resourceKey ||
      !hasUnsavedChanges
    )
      return;
    const writeVersion = cacheWriteVersionRef.current;
    const timer = window.setTimeout(() => {
      if (cacheWriteVersionRef.current !== writeVersion) return;
      const cacheToken = `${resourceKey}:${writeVersion}:${Date.now()}`;
      const snapshot: SkillDraftCacheSnapshot = {
        schemaVersion: 2,
        resourceId: skillResourceId,
        draftVersion: skillDraftVersion,
        cacheToken,
        workspace: { ...state, pendingIntent: null },
        updatedAt: Date.now(),
      };
      void saveSkillDraftCache(snapshot)
        .then(() => {
          if (cacheWriteVersionRef.current === writeVersion) return;
          void loadSkillDraftCache(snapshot.resourceId).then((cached) => {
            if (cached?.cacheToken === cacheToken) void clearSkillDraftCache(snapshot.resourceId);
          });
        })
        .catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [cacheReadyKey, hasUnsavedChanges, resourceKey, skillDraftVersion, skillResourceId, state]);

  /**
   * @wisepen-manual-effect
   * 执行时机：工作区恢复完成且所有草稿均已保存或丢弃时删除本地快照。
   * 不可替代原因：IndexedDB 是 React 外部持久化存储，需要显式清理。
   * cleanup：删除操作幂等，无额外订阅需要清理。
   */
  useEffect(() => {
    if (!skillResourceId || cacheReadyKey !== resourceKey || hasUnsavedChanges) return;
    cacheWriteVersionRef.current += 1;
    void clearSkillDraftCache(skillResourceId).catch(() => undefined);
  }, [cacheReadyKey, hasUnsavedChanges, resourceKey, skillResourceId]);

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
