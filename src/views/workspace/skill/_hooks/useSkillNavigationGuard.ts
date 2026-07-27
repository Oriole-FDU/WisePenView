import type { ISkillService, SkillDetail } from '@/domains/Skill';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

import type { UnsavedSkillChangesMode } from '../_components/UnsavedSkillChangesModal';
import { findFile, findRootMainSkillFile, isLocalAssetId } from '../utils/skillFileTree';
import type { SkillEditorActions, SkillEditorState } from './useSkillEditorController';

export const SKILL_CONFIG_NODE_ID = '__skill_config__';

interface SaveOptions {
  refresh?: boolean;
  showToast?: boolean;
}

interface UseSkillNavigationGuardOptions {
  actions: SkillEditorActions;
  applyTreeSelection: (nodeId: string) => void;
  cancelPendingCreate: () => void;
  clearDraftCache: (resourceId: string) => Promise<unknown>;
  configLoading: boolean;
  discardEditorChanges: () => void;
  hasMissingConfig: boolean;
  hasSavedConfigMissing: boolean;
  hasUnsafeNavigation: boolean;
  hasUnsavedSkillChanges: boolean;
  isConfigDirty: boolean;
  isConfigSelected: boolean;
  isDirty: boolean;
  isSaveQueueActive: boolean;
  refreshSkill: () => void;
  resetConfigDraft: () => void;
  runUpdateConfigAsync: (options?: { showToast?: boolean }) => Promise<unknown>;
  saveCurrentFile: (options?: SaveOptions) => Promise<void>;
  saveLoading: boolean;
  savePendingChanges: (options?: SaveOptions) => Promise<void>;
  skill?: SkillDetail;
  skillService: ISkillService;
  state: SkillEditorState;
}

export function useSkillNavigationGuard({
  actions,
  applyTreeSelection,
  cancelPendingCreate,
  clearDraftCache,
  configLoading,
  discardEditorChanges,
  hasMissingConfig,
  hasSavedConfigMissing,
  hasUnsafeNavigation,
  hasUnsavedSkillChanges,
  isConfigDirty,
  isConfigSelected,
  isDirty,
  isSaveQueueActive,
  refreshSkill,
  resetConfigDraft,
  runUpdateConfigAsync,
  saveCurrentFile,
  saveLoading,
  savePendingChanges,
  skill,
  skillService,
  state,
}: UseSkillNavigationGuardOptions) {
  const { t } = useTranslation('skill');
  const { files, pendingIntent, savedContent, selectedFileId, viewingVersion } = state;
  const {
    setEditing,
    setEditorContent,
    setFiles,
    setPendingIntent,
    setSaveQueueItems,
    setSelectedFileId,
    setSelectedTreeNodeId,
    setViewingVersion,
  } = actions;
  const navigationBlocker = useBlocker(hasUnsafeNavigation);

  /**
   * @wisepen-manual-effect
   * 执行时机：React Router blocker 进入或退出 blocked 状态时同步离开页面意图。
   * 不可替代原因：blocker 是路由器维护的外部状态机，只在导航提交阶段暴露状态。
   * cleanup：blocker 生命周期由 React Router 管理，本层没有额外订阅需要清理。
   */
  useEffect(() => {
    if (navigationBlocker.state === 'blocked') {
      setPendingIntent({ type: 'leave' });
    } else if (pendingIntent?.type === 'leave') {
      setPendingIntent(null);
    }
  }, [navigationBlocker.state, pendingIntent?.type, setPendingIntent]);

  useBeforeUnload(
    (event) => {
      if (!hasUnsafeNavigation) return;
      event.preventDefault();
      event.returnValue = '';
    },
    { capture: true }
  );

  const applyConfigSelection = () => {
    setSelectedTreeNodeId(SKILL_CONFIG_NODE_ID);
    setSelectedFileId('');
    cancelPendingCreate();
    setEditing(false);
  };

  const discardLocalSkillChanges = () => {
    cancelPendingCreate();
    discardEditorChanges();
  };

  const handleConfigSelect = () => {
    if (isSaveQueueActive) {
      toast.warning(t('toast.savingSwitchConfig'));
      return;
    }
    if (isConfigSelected) return;
    if (isDirty) {
      setPendingIntent({ type: 'switchConfig' });
      return;
    }
    applyConfigSelection();
  };

  const handleTreeSelect = useMemoizedFn((nodeId: string) => {
    if (nodeId === SKILL_CONFIG_NODE_ID) {
      handleConfigSelect();
      return;
    }
    if (isSaveQueueActive) {
      toast.warning(t('toast.savingSwitchFile'));
      return;
    }
    const node = findFile(files, nodeId);
    if (!node) return;
    if (isConfigSelected && isConfigDirty) {
      if (node.kind === 'file') {
        setPendingIntent({ type: 'switchFile', fileId: node.id });
        return;
      }
      toast.warning(t('toast.updateConfigBeforeDirectory'));
      return;
    }
    if (node.kind === 'file' && node.id !== selectedFileId && isDirty) {
      setPendingIntent({ type: 'switchFile', fileId: node.id });
      return;
    }
    applyTreeSelection(nodeId);
  });

  const { loading: publishLoading, run: runPublish } = useRequest(
    async () => {
      if (!skill) return;
      await skillService.publishVersion(skill.resourceId);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('toast.publishSuccess'));
        refreshSkill();
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const { loading: versionLoading, run: runSwitchVersion } = useRequest(
    async (version: number) => {
      if (!skill) return null;
      return skillService.getSkillVersionFiles(skill.resourceId, version);
    },
    {
      manual: true,
      onSuccess: (data, params) => {
        if (!data) return;
        setViewingVersion(params[0]);
        setFiles(data.files);
        setSaveQueueItems([]);
        setPendingIntent(null);
        setEditing(false);
      },
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const handlePublish = useMemoizedFn(() => {
    if (isSaveQueueActive) {
      toast.warning(t('toast.savingPublish'));
      return;
    }
    const mainSkillFile = findRootMainSkillFile(files);
    if (!mainSkillFile) {
      toast.warning(t('toast.missingMainFile'));
      return;
    }
    if (hasMissingConfig) {
      toast.warning(t('toast.missingConfig'));
      if (!isDirty) applyConfigSelection();
      return;
    }
    if (hasUnsavedSkillChanges || isConfigDirty || isLocalAssetId(mainSkillFile.id)) {
      setPendingIntent({ type: 'publish' });
      return;
    }
    runPublish();
  });

  const handleSaveAndPublish = async () => {
    try {
      await savePendingChanges({ refresh: false, showToast: false });
      setPendingIntent(null);
      runPublish();
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleDiscardAndPublish = () => {
    discardLocalSkillChanges();
    if (skill) void clearDraftCache(skill.resourceId);
    if (hasSavedConfigMissing) {
      setPendingIntent(null);
      toast.warning(t('toast.missingConfig'));
      if (!isDirty) applyConfigSelection();
      return;
    }
    setPendingIntent(null);
    runPublish();
  };

  const handleCancelLeave = () => {
    if (navigationBlocker.state === 'blocked') navigationBlocker.reset();
    setPendingIntent(null);
  };

  const handleDiscardAndLeave = async () => {
    if (navigationBlocker.state !== 'blocked') return;
    discardLocalSkillChanges();
    if (skill) await clearDraftCache(skill.resourceId);
    navigationBlocker.proceed();
  };

  const handleSaveAndLeave = async () => {
    if (navigationBlocker.state !== 'blocked') return;
    try {
      await savePendingChanges({ refresh: false, showToast: false });
      navigationBlocker.proceed();
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleDiscardAndSwitchConfig = () => {
    setPendingIntent(null);
    setEditorContent(savedContent);
    setEditing(false);
    applyConfigSelection();
  };

  const handleSaveAndSwitchConfig = async () => {
    try {
      await saveCurrentFile({ refresh: false, showToast: false });
      setPendingIntent(null);
      applyConfigSelection();
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleDiscardAndSwitchFile = () => {
    const nextFileId = pendingIntent?.type === 'switchFile' ? pendingIntent.fileId : '';
    setPendingIntent(null);
    if (isConfigSelected) resetConfigDraft();
    else setEditorContent(savedContent);
    if (nextFileId) applyTreeSelection(nextFileId);
    setEditing(false);
  };

  const handleSaveAndSwitchFile = async () => {
    const nextFileId = pendingIntent?.type === 'switchFile' ? pendingIntent.fileId : '';
    if (!nextFileId) return;
    try {
      if (isConfigSelected) await runUpdateConfigAsync({ showToast: false });
      else await saveCurrentFile({ refresh: false, showToast: false });
      setPendingIntent(null);
      applyTreeSelection(nextFileId);
      setEditing(false);
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleVersionSelect = useMemoizedFn((version: number) => {
    if (version === viewingVersion) return;
    if (isSaveQueueActive) {
      toast.warning(t('toast.savingSwitchVersion'));
      return;
    }
    if (hasUnsafeNavigation) {
      setPendingIntent({ type: 'switchVersion', version });
      return;
    }
    runSwitchVersion(version);
  });

  const handleDiscardAndSwitchVersion = () => {
    const nextVersion = pendingIntent?.type === 'switchVersion' ? pendingIntent.version : null;
    setPendingIntent(null);
    discardLocalSkillChanges();
    if (skill) void clearDraftCache(skill.resourceId);
    if (nextVersion != null) runSwitchVersion(nextVersion);
  };

  const handleSaveAndSwitchVersion = async () => {
    const nextVersion = pendingIntent?.type === 'switchVersion' ? pendingIntent.version : null;
    if (nextVersion == null) return;
    try {
      await savePendingChanges({ refresh: false, showToast: false });
      setPendingIntent(null);
      runSwitchVersion(nextVersion);
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const pendingIntentMode: UnsavedSkillChangesMode | null = pendingIntent?.type ?? null;
  const pendingIntentLoading =
    saveLoading ||
    (pendingIntent?.type !== 'switchConfig' && configLoading) ||
    (pendingIntent?.type === 'publish' && publishLoading);

  const handleCancelPendingIntent = () => {
    if (pendingIntent?.type === 'leave') {
      handleCancelLeave();
      return;
    }
    setPendingIntent(null);
  };

  const handleDiscardPendingIntent = () => {
    if (pendingIntent?.type === 'publish') handleDiscardAndPublish();
    if (pendingIntent?.type === 'leave') void handleDiscardAndLeave();
    if (pendingIntent?.type === 'switchFile') handleDiscardAndSwitchFile();
    if (pendingIntent?.type === 'switchConfig') handleDiscardAndSwitchConfig();
    if (pendingIntent?.type === 'switchVersion') handleDiscardAndSwitchVersion();
  };

  const handleConfirmPendingIntent = () => {
    if (pendingIntent?.type === 'publish') void handleSaveAndPublish();
    if (pendingIntent?.type === 'leave') void handleSaveAndLeave();
    if (pendingIntent?.type === 'switchFile') void handleSaveAndSwitchFile();
    if (pendingIntent?.type === 'switchConfig') void handleSaveAndSwitchConfig();
    if (pendingIntent?.type === 'switchVersion') void handleSaveAndSwitchVersion();
  };

  return {
    applyConfigSelection,
    handleCancelPendingIntent,
    handleConfirmPendingIntent,
    handleDiscardPendingIntent,
    handlePublish,
    handleTreeSelect,
    handleVersionSelect,
    pendingIntentLoading,
    pendingIntentMode,
    publishLoading,
    versionLoading,
  };
}
