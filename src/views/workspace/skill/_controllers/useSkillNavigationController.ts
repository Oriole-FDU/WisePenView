import { useSkillService } from '@/domains';
import type { SkillDetail, SkillFileNode } from '@/domains/Skill';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useLatest, useRequest } from 'ahooks';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

import type { UnsavedSkillChangesMode } from '../_components/UnsavedSkillChangesModal';
import type { SkillWorkspacePendingIntent } from '../_models/workspaceDraft';
import { findRootMainSkillFile } from '../utils/skillFileTree';

export const SKILL_CONFIG_NODE_ID = '__skill_config__';

interface SaveOptions {
  refresh?: boolean;
  showToast?: boolean;
}

interface UseSkillNavigationControllerOptions {
  clearDraftCache: () => Promise<void>;
  configValuesMissing: boolean;
  discardAll: () => void;
  editing: boolean;
  files: SkillFileNode[];
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onConfigSelected: () => void;
  onEditingChanged: (editing: boolean) => void;
  onVersionFilesLoaded: (files: SkillFileNode[], version: number) => void;
  pendingIntent: SkillWorkspacePendingIntent;
  persistedFiles: SkillFileNode[];
  refreshSkill: () => void;
  saveAll: (options?: SaveOptions) => Promise<void>;
  savedConfigValuesMissing: boolean;
  setPendingIntent: (intent: SkillWorkspacePendingIntent) => void;
  skill?: SkillDetail;
  viewingVersion: number | null;
}

export function useSkillNavigationController({
  clearDraftCache,
  configValuesMissing,
  discardAll,
  editing,
  files,
  hasUnsavedChanges,
  isSaving,
  onConfigSelected,
  onEditingChanged,
  onVersionFilesLoaded,
  pendingIntent,
  persistedFiles,
  refreshSkill,
  saveAll,
  savedConfigValuesMissing,
  setPendingIntent,
  skill,
  viewingVersion,
}: UseSkillNavigationControllerOptions) {
  const { t } = useTranslation('skill');
  const skillService = useSkillService();
  const hasUnsafeNavigation = hasUnsavedChanges || isSaving;
  const hasUnsavedChangesLatest = useLatest(hasUnsavedChanges);
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

  const { loading: publishLoading, run: publish } = useRequest(
    async () => {
      if (skill) await skillService.publishVersion(skill.resourceId);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('toast.publishSuccess'));
        refreshSkill();
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const { loading: versionLoading, run: switchVersion } = useRequest(
    async (version: number) => {
      if (!skill) return null;
      return skillService.getSkillVersionFiles(skill.resourceId, version);
    },
    {
      manual: true,
      onSuccess: (data, params) => {
        if (data) onVersionFilesLoaded(data.files, params[0]);
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const handleToggleEditing = () => {
    if (!editing) {
      onEditingChanged(true);
      return;
    }
    if (hasUnsavedChanges) {
      setPendingIntent({ type: 'cancelEditing' });
      return;
    }
    onEditingChanged(false);
  };

  const handlePublish = () => {
    if (isSaving) {
      toast.warning(t('toast.savingPublish'));
      return;
    }
    if (!findRootMainSkillFile(files)) {
      toast.warning(t('toast.missingMainFile'));
      return;
    }
    if (configValuesMissing) {
      toast.warning(t('toast.missingConfig'));
      onConfigSelected();
      return;
    }
    if (hasUnsavedChanges) {
      setPendingIntent({ type: 'publish' });
      return;
    }
    publish();
  };

  const saveAndContinue = async (continuation: () => void) => {
    try {
      await saveAll({ refresh: false, showToast: false });
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (hasUnsavedChangesLatest.current) return;
      setPendingIntent(null);
      continuation();
    } catch {
      // 保存 Controller 已按 Config 与文件任务分别提示失败原因。
    }
  };

  const discardAndPublish = () => {
    discardAll();
    void clearDraftCache();
    if (savedConfigValuesMissing) {
      setPendingIntent(null);
      toast.warning(t('toast.missingConfig'));
      onConfigSelected();
      return;
    }
    if (!findRootMainSkillFile(persistedFiles)) {
      setPendingIntent(null);
      toast.warning(t('toast.missingMainFile'));
      return;
    }
    setPendingIntent(null);
    publish();
  };

  const handleVersionSelect = (version: number) => {
    if (version === viewingVersion) return;
    if (isSaving) {
      toast.warning(t('toast.savingSwitchVersion'));
      return;
    }
    if (hasUnsavedChanges) {
      setPendingIntent({ type: 'switchVersion', version });
      return;
    }
    switchVersion(version);
  };

  const handleCancelPendingIntent = () => {
    if (pendingIntent?.type === 'leave' && navigationBlocker.state === 'blocked') {
      navigationBlocker.reset();
    }
    setPendingIntent(null);
  };

  const handleDiscardPendingIntent = () => {
    if (pendingIntent?.type === 'publish') {
      discardAndPublish();
      return;
    }
    if (pendingIntent?.type === 'leave') {
      if (navigationBlocker.state !== 'blocked') return;
      discardAll();
      void clearDraftCache().then(() => navigationBlocker.proceed());
      return;
    }
    if (pendingIntent?.type === 'switchVersion') {
      const version = pendingIntent.version;
      discardAll();
      void clearDraftCache();
      setPendingIntent(null);
      switchVersion(version);
      return;
    }
    if (pendingIntent?.type === 'cancelEditing') {
      discardAll();
      void clearDraftCache();
      setPendingIntent(null);
    }
  };

  const handleConfirmPendingIntent = () => {
    if (pendingIntent?.type === 'publish') {
      void saveAndContinue(() => publish());
      return;
    }
    if (pendingIntent?.type === 'leave') {
      void saveAndContinue(() => {
        if (navigationBlocker.state === 'blocked') navigationBlocker.proceed();
      });
      return;
    }
    if (pendingIntent?.type === 'switchVersion') {
      const version = pendingIntent.version;
      void saveAndContinue(() => switchVersion(version));
      return;
    }
    if (pendingIntent?.type === 'cancelEditing') {
      void saveAndContinue(() => onEditingChanged(false));
    }
  };

  return {
    handleCancelPendingIntent,
    handleConfirmPendingIntent,
    handleDiscardPendingIntent,
    handlePublish,
    handleToggleEditing,
    handleVersionSelect,
    pendingIntentLoading: isSaving || publishLoading || versionLoading,
    pendingIntentMode: pendingIntent?.type as UnsavedSkillChangesMode | undefined,
    publishLoading,
    versionLoading,
  };
}
