import { useSkillService } from '@/domains';
import type { SkillDetail, UploadSkillAssetResult } from '@/domains/Skill';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SkillSaveQueueItem } from '../_components/SkillSaveQueueDock/index.type';
import type { SkillConfigSaveSnapshot, SkillFileSaveSnapshot } from '../_models/workspaceDraft';
import { resolveSkillSavePhase } from '../model';

const CONFIG_QUEUE_ID = '__skill_config_save__';

interface SaveOptions {
  refresh?: boolean;
  showToast?: boolean;
}

interface UseSkillSaveControllerOptions {
  activeFileSnapshots: SkillFileSaveSnapshot[];
  canEdit: boolean;
  configSnapshot: SkillConfigSaveSnapshot | null;
  fileSnapshots: SkillFileSaveSnapshot[];
  onConfigSaveFailed: () => void;
  onConfigSaveStarted: (snapshot: SkillConfigSaveSnapshot) => void;
  onConfigSaved: (snapshot: SkillConfigSaveSnapshot) => void;
  onFileSaveFailed: (snapshots: SkillFileSaveSnapshot[]) => void;
  onFileSaveStarted: (snapshots: SkillFileSaveSnapshot[]) => void;
  onFilesSaved: (snapshots: SkillFileSaveSnapshot[], results: UploadSkillAssetResult[]) => void;
  refreshSkill: () => void;
  skill?: SkillDetail;
}

function createFileQueueItem(snapshot: SkillFileSaveSnapshot): SkillSaveQueueItem {
  return {
    id: snapshot.editorKey,
    kind: 'file',
    name: snapshot.file.name,
    path: snapshot.file.path,
    size: snapshot.file.size,
    revision: snapshot.revision,
    phase: 'pending',
    progress: 0,
  };
}

function createConfigQueueItem(
  snapshot: SkillConfigSaveSnapshot,
  name: string,
  path: string
): SkillSaveQueueItem {
  return {
    id: CONFIG_QUEUE_ID,
    kind: 'config',
    name,
    path,
    revision: snapshot.revision,
    phase: 'pending',
    progress: 0,
  };
}

function replaceQueueItems(
  current: SkillSaveQueueItem[],
  nextItems: SkillSaveQueueItem[]
): SkillSaveQueueItem[] {
  const nextIds = new Set(nextItems.map((item) => item.id));
  return [...current.filter((item) => !nextIds.has(item.id)), ...nextItems];
}

export function useSkillSaveController({
  activeFileSnapshots,
  canEdit,
  configSnapshot,
  fileSnapshots,
  onConfigSaveFailed,
  onConfigSaveStarted,
  onConfigSaved,
  onFileSaveFailed,
  onFileSaveStarted,
  onFilesSaved,
  refreshSkill,
  skill,
}: UseSkillSaveControllerOptions) {
  const { t } = useTranslation('skill');
  const skillService = useSkillService();
  const [executionItems, setExecutionItems] = useState<SkillSaveQueueItem[]>([]);
  const fileSaveInFlightRef = useRef(false);
  const configSaveInFlightRef = useRef(false);

  const { loading: fileSaveLoading, runAsync: runSaveFiles } = useRequest(
    async (snapshots: SkillFileSaveSnapshot[], options?: SaveOptions) => {
      if (!skill || snapshots.length === 0) return { options };
      onFileSaveStarted(snapshots);
      setExecutionItems((current) =>
        replaceQueueItems(
          current,
          snapshots.map((snapshot) => ({
            ...createFileQueueItem(snapshot),
            phase: 'preparing',
          }))
        )
      );

      let results: UploadSkillAssetResult[];
      try {
        results = await skillService.uploadAssets(
          skill.resourceId,
          skill.draftVersion,
          snapshots.map((snapshot) => ({
            clientId: snapshot.editorKey,
            name: snapshot.file.name,
            path: snapshot.file.path,
            content: snapshot.content,
            size: snapshot.file.size,
          })),
          {
            onProgress: ({ clientId, progress }) => {
              setExecutionItems((current) =>
                current.map((item) =>
                  item.id === clientId ? { ...item, phase: 'uploading', progress } : item
                )
              );
            },
          }
        );
      } catch (error) {
        onFileSaveFailed(snapshots);
        const errorMessage = parseErrorMessage(error);
        const snapshotKeys = new Set(snapshots.map((snapshot) => snapshot.editorKey));
        setExecutionItems((current) =>
          current.map((item) =>
            snapshotKeys.has(item.id)
              ? { ...item, phase: 'failed', errorMessage, progress: 0 }
              : item
          )
        );
        throw error;
      }

      onFilesSaved(snapshots, results);
      const resultByKey = new Map(results.map((result) => [result.clientId, result]));
      setExecutionItems((current) =>
        current.flatMap((item) => {
          const snapshot = snapshots.find((candidate) => candidate.editorKey === item.id);
          if (!snapshot) return [item];
          const result = resultByKey.get(item.id);
          if (result && !result.error) return [];
          return [
            {
              ...item,
              phase: 'failed',
              progress: 0,
              errorMessage: result?.error
                ? parseErrorMessage(result.error)
                : t('queue.resultMissing'),
            },
          ];
        })
      );

      const failedResults = snapshots.filter((snapshot) => {
        const result = resultByKey.get(snapshot.editorKey);
        return !result || Boolean(result.error);
      });
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
        if (result?.options?.showToast !== false) toast.success(t('toast.saveSuccess'));
        if (result?.options?.refresh) refreshSkill();
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const { loading: configSaveLoading, runAsync: runSaveConfig } = useRequest(
    async (snapshot: SkillConfigSaveSnapshot, options?: SaveOptions) => {
      if (!skill) return { options };
      onConfigSaveStarted(snapshot);
      const queueItem = {
        ...createConfigQueueItem(snapshot, t('config.title'), t('config.queuePath')),
        phase: 'preparing' as const,
      };
      setExecutionItems((current) => replaceQueueItems(current, [queueItem]));
      if (!snapshot.name || !snapshot.description) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_CONFIG_REQUIRED);
      }
      await skillService.updateSkillInfo(skill.resourceId, snapshot.name, snapshot.description);
      onConfigSaved(snapshot);
      setExecutionItems((current) => current.filter((item) => item.id !== CONFIG_QUEUE_ID));
      return { options };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (result?.options?.showToast !== false) toast.success(t('toast.configUpdated'));
        if (result?.options?.refresh) refreshSkill();
      },
      onError: (error) => {
        onConfigSaveFailed();
        setExecutionItems((current) =>
          current.map((item) =>
            item.id === CONFIG_QUEUE_ID
              ? {
                  ...item,
                  phase: 'failed',
                  progress: 0,
                  errorMessage: parseErrorMessage(error),
                }
              : item
          )
        );
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const saveFiles = async (snapshots: SkillFileSaveSnapshot[], options?: SaveOptions) => {
    if (!canEdit || snapshots.length === 0 || fileSaveInFlightRef.current) return;
    fileSaveInFlightRef.current = true;
    try {
      await runSaveFiles(snapshots, options);
    } finally {
      fileSaveInFlightRef.current = false;
    }
  };

  const saveCurrentFile = async (options?: SaveOptions) => {
    await saveFiles(activeFileSnapshots, options);
  };

  const saveConfigSnapshot = async (snapshot: SkillConfigSaveSnapshot, options?: SaveOptions) => {
    if (!canEdit || configSaveInFlightRef.current) return;
    configSaveInFlightRef.current = true;
    try {
      await runSaveConfig(snapshot, options);
    } finally {
      configSaveInFlightRef.current = false;
    }
  };

  const saveConfig = async (options?: SaveOptions) => {
    if (!configSnapshot) return;
    await saveConfigSnapshot(configSnapshot, options);
  };

  const saveAll = async (options?: SaveOptions) => {
    if (!canEdit) return;
    const tasks: Promise<unknown>[] = [];
    if (fileSnapshots.length > 0) {
      tasks.push(saveFiles(fileSnapshots, { ...options, showToast: false }));
    }
    if (configSnapshot) {
      tasks.push(saveConfigSnapshot(configSnapshot, { ...options, showToast: false }));
    }
    if (tasks.length === 0) return;
    const results = await Promise.allSettled(tasks);
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
    if (options?.showToast !== false) toast.success(t('toast.saveSuccess'));
    if (options?.refresh) refreshSkill();
  };

  const handleSaveAll = () => {
    void saveAll().catch(() => undefined);
  };

  const handleSaveCurrentFile = () => {
    void saveCurrentFile().catch(() => undefined);
  };

  const pendingItems = [
    ...fileSnapshots.map(createFileQueueItem),
    ...(configSnapshot
      ? [createConfigQueueItem(configSnapshot, t('config.title'), t('config.queuePath'))]
      : []),
  ];
  const pendingItemById = new Map(pendingItems.map((item) => [item.id, item]));
  const relevantExecutionItems = executionItems.filter(
    (item) =>
      item.phase === 'preparing' ||
      item.phase === 'uploading' ||
      pendingItemById.get(item.id)?.revision === item.revision
  );
  const executionIds = new Set(relevantExecutionItems.map((item) => item.id));
  const visibleQueueItems = [
    ...relevantExecutionItems,
    ...pendingItems.filter((item) => !executionIds.has(item.id)),
  ];
  const isSaving = fileSaveLoading || configSaveLoading;
  const hasFailedItems = relevantExecutionItems.some((item) => item.phase === 'failed');
  const hasSaveableChanges = fileSnapshots.length > 0 || configSnapshot !== null;
  const savePhase = resolveSkillSavePhase({
    hasUnsavedChanges: hasSaveableChanges,
    hasFailedItems,
    isSaving,
  });

  const removeQueueItems = (editorKeys: Set<string>) => {
    setExecutionItems((current) => current.filter((item) => !editorKeys.has(item.id)));
  };

  return {
    configSaveLoading,
    fileSaveLoading,
    handleSaveAll,
    handleSaveCurrentFile,
    hasFailedItems,
    hasSaveableChanges,
    isSaving,
    removeQueueItems,
    saveAll,
    saveConfig,
    saveCurrentFile,
    savePhase,
    visibleQueueItems,
  };
}
