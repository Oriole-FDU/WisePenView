import type {
  ISkillService,
  SkillDetail,
  SkillFileNode,
  UploadSkillAssetResult,
} from '@/domains/Skill';
import i18n from '@/i18n';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SkillSaveQueueItem } from '../_components/SkillSaveQueueDock/index.type';
import {
  clearSkillDraftCache,
  loadSkillDraftCache,
  saveSkillDraftCache,
} from '../utils/skillDraftCache';
import {
  canPreviewSkillFile,
  collectLocalAssetNodes,
  isLocalAssetNode,
  updateSavedTreeFile,
  updateTreeFileContent,
} from '../utils/skillFileTree';
import {
  resolveSkillEditorSavePhase,
  type SkillEditorActions,
  type SkillEditorState,
} from './useSkillEditorController';

interface SaveAssetOptions {
  refresh?: boolean;
  showToast?: boolean;
}

interface SaveSkillConfigOptions {
  showToast?: boolean;
}

interface SaveSkillFileTarget {
  file: SkillFileNode;
  content: string | Blob;
}

interface UseSkillSaveOptions {
  actions: SkillEditorActions;
  canEdit: boolean;
  refreshSkill: () => void;
  selectedFile: SkillFileNode | null;
  skill?: SkillDetail;
  skillService: ISkillService;
  state: SkillEditorState;
}

interface RestoredEditorDraft {
  fileId: string;
  editorContent: string;
  savedContent: string;
}

export function useSkillSave({
  actions,
  canEdit,
  refreshSkill,
  selectedFile,
  skill,
  skillService,
  state,
}: UseSkillSaveOptions) {
  const { t } = useTranslation('skill');
  const draftCacheWriteVersionRef = useRef(0);
  const restoredEditorDraftRef = useRef<RestoredEditorDraft | null>(null);
  const draftCacheKey = skill ? JSON.stringify([skill.resourceId, skill.draftVersion]) : null;
  const [readyDraftCacheKey, setReadyDraftCacheKey] = useState<string | null>(null);
  const draftCacheReady = draftCacheKey !== null && readyDraftCacheKey === draftCacheKey;
  const {
    configDescription,
    configName,
    editorContent,
    files,
    pendingIntent,
    savedConfigDescription,
    savedConfigName,
    savedContent,
    saveQueueItems,
    selectedFileId,
    selectedTreeNodeId,
    viewingVersion,
  } = state;
  const {
    discardLocalChanges,
    initialize,
    restoreDraft,
    setConfigDescription,
    setConfigName,
    setEditing,
    setFiles,
    setPendingIntent,
    setSavedConfigDescription,
    setSavedConfigName,
    setSavedContent,
    setSaveQueueItems,
    setSelectedFileId,
    setSelectedTreeNodeId,
  } = actions;

  const invalidateDraftCacheWrites = useMemoizedFn(() => {
    draftCacheWriteVersionRef.current += 1;
  });

  const clearDraftCache = useMemoizedFn((targetResourceId: string) => {
    invalidateDraftCacheWrites();
    return clearSkillDraftCache(targetResourceId).catch(() => undefined);
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：Skill 详情或草稿版本变化时初始化编辑状态并恢复匹配的本地草稿。
   * 不可替代原因：草稿保存在异步 IndexedDB，读取结果需要写入当前编辑器控制器。
   * cleanup：标记本轮读取已失效，防止旧资源异步结果覆盖新页面。
   */
  useEffect(() => {
    if (!skill) return;
    let disposed = false;

    invalidateDraftCacheWrites();
    initialize(skill);

    void loadSkillDraftCache(skill.resourceId)
      .then((snapshot) => {
        if (disposed) return;
        if (!snapshot || snapshot.draftVersion !== skill.draftVersion) {
          setReadyDraftCacheKey(draftCacheKey);
          return;
        }
        restoredEditorDraftRef.current = snapshot.selectedFileId
          ? {
              fileId: snapshot.selectedFileId,
              editorContent: snapshot.editorContent,
              savedContent: snapshot.savedContent,
            }
          : null;
        restoreDraft(snapshot, skill);
        setReadyDraftCacheKey(draftCacheKey);
        toast.warning(i18n.t('toast.draftRestored', { ns: 'skill' }));
      })
      .catch(() => {
        if (!disposed) setReadyDraftCacheKey(draftCacheKey);
      });

    return () => {
      disposed = true;
    };
  }, [draftCacheKey, initialize, invalidateDraftCacheWrites, restoreDraft, skill]);

  const localAssetNodes = collectLocalAssetNodes(files);
  const isDirty = canEdit && editorContent !== savedContent;
  const isConfigDirty =
    canEdit && (configName !== savedConfigName || configDescription !== savedConfigDescription);
  const hasConfigValuesMissing =
    configName.trim().length === 0 || configDescription.trim().length === 0;
  const hasSavedConfigMissing =
    savedConfigName.trim().length === 0 || savedConfigDescription.trim().length === 0;
  const hasMissingConfig = canEdit && hasConfigValuesMissing;
  const hasUnsavedLocalAssets = canEdit && localAssetNodes.length > 0;
  const hasFailedSaveItems = saveQueueItems.some((item) => item.phase === 'failed');
  const hasSaveableChanges = isDirty || hasUnsavedLocalAssets || hasFailedSaveItems;
  const isSaveQueueActive = saveQueueItems.some(
    (item) => item.phase === 'preparing' || item.phase === 'uploading'
  );
  const hasUnsavedSkillChanges =
    canEdit && (isDirty || hasUnsavedLocalAssets || hasFailedSaveItems);
  const hasUnsafeNavigation = hasUnsavedSkillChanges || isConfigDirty || isSaveQueueActive;
  const hasRecoverableDraft = hasUnsavedSkillChanges || isConfigDirty;
  const pendingLocalSaveQueueItems = localAssetNodes.map((file) => ({
    id: file.id,
    name: file.name,
    path: file.path,
    size: file.size,
    phase: 'pending',
    progress: 0,
  })) satisfies SkillSaveQueueItem[];
  const visibleSaveQueueItems =
    saveQueueItems.length > 0 ? saveQueueItems : pendingLocalSaveQueueItems;

  /**
   * @wisepen-manual-effect
   * 执行时机：可恢复编辑状态变化后防抖写入本地草稿快照。
   * 不可替代原因：IndexedDB 与 Blob 持久化属于 React 外部异步存储。
   * cleanup：取消尚未开始的防抖写入，并通过版本令牌废弃已过期任务。
   */
  useEffect(() => {
    if (!skill || !draftCacheReady || !canEdit || !hasRecoverableDraft) return;
    const cacheWriteVersion = draftCacheWriteVersionRef.current;
    const timer = window.setTimeout(() => {
      if (draftCacheWriteVersionRef.current !== cacheWriteVersion) return;
      const filesForCache =
        selectedFile && canPreviewSkillFile(selectedFile)
          ? updateTreeFileContent(files, selectedFile.id, editorContent)
          : files;
      const cacheToken = `${skill.resourceId}:${cacheWriteVersion}:${Date.now()}`;
      const snapshot = {
        resourceId: skill.resourceId,
        draftVersion: skill.draftVersion,
        cacheToken,
        files: filesForCache,
        selectedFileId,
        selectedTreeNodeId,
        editorContent,
        savedContent,
        viewingVersion,
        saveQueueItems,
        configName,
        configDescription,
        savedConfigName,
        savedConfigDescription,
        updatedAt: Date.now(),
      };
      void saveSkillDraftCache(snapshot)
        .then(() => {
          if (draftCacheWriteVersionRef.current === cacheWriteVersion) return;
          void loadSkillDraftCache(snapshot.resourceId)
            .then((cachedSnapshot) => {
              if (cachedSnapshot?.cacheToken === cacheToken) {
                void clearSkillDraftCache(snapshot.resourceId);
              }
            })
            .catch(() => undefined);
        })
        .catch(() => {
          // IndexedDB 失败不阻断页面编辑，只是不提供本地草稿恢复。
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    canEdit,
    configDescription,
    configName,
    draftCacheReady,
    editorContent,
    files,
    hasRecoverableDraft,
    saveQueueItems,
    savedConfigDescription,
    savedConfigName,
    savedContent,
    selectedFile,
    selectedFileId,
    selectedTreeNodeId,
    skill,
    viewingVersion,
  ]);

  /**
   * @wisepen-manual-effect
   * 执行时机：草稿缓存就绪且编辑状态恢复干净时删除本地快照。
   * 不可替代原因：IndexedDB 是 React 外部持久化存储，必须显式执行删除命令。
   * cleanup：删除操作幂等且由缓存层管理，无额外订阅需要清理。
   */
  useEffect(() => {
    if (!skill || !draftCacheReady || hasRecoverableDraft) return;
    void clearDraftCache(skill.resourceId);
  }, [clearDraftCache, draftCacheReady, hasRecoverableDraft, skill]);

  const consumeRestoredEditorDraft = useMemoizedFn((fileId: string) => {
    const restoredDraft = restoredEditorDraftRef.current;
    if (!restoredDraft || restoredDraft.fileId !== fileId) return null;
    restoredEditorDraftRef.current = null;
    return restoredDraft;
  });

  const buildAllSaveTargets = (): SaveSkillFileTarget[] => {
    if (!canEdit) return [];
    const targetMap = new Map<string, SaveSkillFileTarget>();

    localAssetNodes.forEach((file) => {
      targetMap.set(file.id, {
        file,
        content: file.contentBlob ?? file.content ?? '',
      });
    });

    if (selectedFile && isDirty) {
      targetMap.set(selectedFile.id, {
        file: selectedFile,
        content: editorContent,
      });
    }

    return [...targetMap.values()];
  };

  const buildCurrentSaveTarget = (): SaveSkillFileTarget[] => {
    if (!selectedFile || !canEdit) return [];
    if (!isDirty && !isLocalAssetNode(selectedFile)) return [];
    if (!canPreviewSkillFile(selectedFile)) {
      if (!isLocalAssetNode(selectedFile) || !selectedFile.contentBlob) return [];
      return [{ file: selectedFile, content: selectedFile.contentBlob }];
    }
    return [{ file: selectedFile, content: editorContent }];
  };

  const { loading: saveLoading, runAsync: runSaveTargetsAsync } = useRequest(
    async (targets: SaveSkillFileTarget[], options?: SaveAssetOptions) => {
      if (!skill || targets.length === 0) return { options };

      setSaveQueueItems(
        targets.map(({ file }) => ({
          id: file.id,
          name: file.name,
          path: file.path,
          size: file.size,
          phase: 'preparing',
          progress: 0,
        }))
      );

      const currentSelectedFileId = selectedFile?.id;
      let results: UploadSkillAssetResult[];
      try {
        results = await skillService.uploadAssets(
          skill.resourceId,
          skill.draftVersion,
          targets.map(({ file, content }) => ({
            clientId: file.id,
            name: file.name,
            path: file.path,
            content,
            size: file.size,
          })),
          {
            onProgress: ({ clientId, progress }) => {
              setSaveQueueItems((current) =>
                current.map((item) =>
                  item.id === clientId ? { ...item, phase: 'uploading', progress } : item
                )
              );
            },
          }
        );
      } catch (error) {
        const errorMessage = parseErrorMessage(error);
        setSaveQueueItems((current) =>
          current.map((item) =>
            item.phase === 'preparing' || item.phase === 'uploading'
              ? { ...item, phase: 'failed', errorMessage }
              : item
          )
        );
        throw error;
      }

      const targetById = new Map(targets.map((target) => [target.file.id, target]));
      const resultById = new Map(results.map((result) => [result.clientId, result]));
      const failedResults = results.filter((result) => result.error);
      const successResults = results.filter((result) => !result.error);

      if (successResults.length > 0) {
        setFiles((current) =>
          successResults.reduce((tree, result) => {
            const target = targetById.get(result.clientId);
            if (!target) return tree;
            return updateSavedTreeFile(
              tree,
              target.file.id,
              target.content,
              result.assetId,
              result.objectKey
            );
          }, current)
        );

        successResults.forEach((result) => {
          const assetId = result.assetId;
          if (!assetId) return;
          setSelectedFileId((current) => (current === result.clientId ? assetId : current));
          setSelectedTreeNodeId((current) => (current === result.clientId ? assetId : current));
          if (pendingIntent?.type === 'switchFile' && pendingIntent.fileId === result.clientId) {
            setPendingIntent({ type: 'switchFile', fileId: assetId });
          }
        });

        const selectedTarget = currentSelectedFileId ? targetById.get(currentSelectedFileId) : null;
        const selectedResult = currentSelectedFileId ? resultById.get(currentSelectedFileId) : null;
        if (
          selectedTarget &&
          selectedResult &&
          !selectedResult.error &&
          typeof selectedTarget.content === 'string'
        ) {
          setSavedContent(selectedTarget.content);
        }
      }

      setSaveQueueItems((current) =>
        current.map((item) => {
          const result = resultById.get(item.id);
          if (!result) {
            return item.phase === 'preparing' || item.phase === 'uploading'
              ? { ...item, phase: 'failed', errorMessage: t('queue.resultMissing') }
              : item;
          }
          if (result.error) {
            return {
              ...item,
              phase: 'failed',
              errorMessage: parseErrorMessage(result.error),
            };
          }
          return { ...item, phase: 'done', progress: 100 };
        })
      );

      if (failedResults.length > 0) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_BATCH_SAVE_FAILED, {
          failedCount: failedResults.length,
        });
      }

      return { options };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setSaveQueueItems([]);
        setEditing(false);
        if (skill) void clearDraftCache(skill.resourceId);
        if (result.options?.showToast !== false) toast.success(t('toast.saveSuccess'));
        if (result.options?.refresh === true) refreshSkill();
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const saveTargets = async (targets: SaveSkillFileTarget[], options?: SaveAssetOptions) => {
    if (targets.length === 0) {
      setSaveQueueItems((current) =>
        current.some((item) => item.phase === 'failed') ? [] : current
      );
      return;
    }
    await runSaveTargetsAsync(targets, options);
  };

  const { loading: configLoading, runAsync: runUpdateConfigAsync } = useRequest(
    async (options?: SaveSkillConfigOptions) => {
      if (!skill) return null;
      const name = configName.trim();
      const description = configDescription.trim();
      if (!name || !description) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_CONFIG_REQUIRED);
      }
      await skillService.updateSkillInfo(skill.resourceId, name, description);
      return { name, description, options };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setConfigName(result.name);
        setConfigDescription(result.description);
        setSavedConfigName(result.name);
        setSavedConfigDescription(result.description);
        if (result.options?.showToast !== false) toast.success(t('toast.configUpdated'));
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const savePendingChanges = useMemoizedFn(
    async (options?: SaveAssetOptions & SaveSkillConfigOptions) => {
      if (isConfigDirty) await runUpdateConfigAsync(options);
      await saveTargets(buildAllSaveTargets(), options);
    }
  );

  const saveCurrentFile = useMemoizedFn(async (options?: SaveAssetOptions) => {
    if (!canEdit) return;
    await saveTargets(buildCurrentSaveTarget(), options);
  });

  const handleSave = useMemoizedFn(() => {
    if (!canEdit) return;
    void saveTargets(buildAllSaveTargets());
  });

  const resetConfigDraft = useMemoizedFn(() => {
    setConfigName(savedConfigName);
    setConfigDescription(savedConfigDescription);
  });

  const discardLocalSkillChanges = useMemoizedFn(() => {
    if (skill) discardLocalChanges(skill);
  });

  const savePhase = resolveSkillEditorSavePhase({
    isFileDirty: isDirty,
    isConfigDirty,
    hasUnsavedLocalAssets,
    saveQueueItems,
    isSaving: saveLoading || configLoading || isSaveQueueActive,
  });

  return {
    clearDraftCache,
    configLoading,
    consumeRestoredEditorDraft,
    discardLocalSkillChanges,
    handleSave,
    hasConfigValuesMissing,
    hasMissingConfig,
    hasSaveableChanges,
    hasSavedConfigMissing,
    hasUnsafeNavigation,
    hasUnsavedSkillChanges,
    isConfigDirty,
    isDirty,
    isSaveQueueActive,
    resetConfigDraft,
    runUpdateConfigAsync,
    saveCurrentFile,
    saveLoading,
    savePendingChanges,
    savePhase,
    visibleSaveQueueItems,
  };
}
