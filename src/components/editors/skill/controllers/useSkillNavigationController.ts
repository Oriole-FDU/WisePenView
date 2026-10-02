import { toast } from '@heroui/react';
import { useLatest } from 'ahooks';
import { useTranslation } from 'react-i18next';

import { useSkillService } from '@/domains';
import type { SkillDetail, SkillFileNode } from '@/domains/Skill';
import { useApi } from '@/hooks/useApi';

import type { UnsavedSkillChangesMode } from '../components/UnsavedSkillChangesModal';
import type { SkillWorkspacePendingIntent } from '../models/workspaceDraft';
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
  isOwner: boolean;
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
  isOwner,
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
  const hasUnsavedChangesLatest = useLatest(hasUnsavedChanges);
  const { loading: publishLoading, run: publish } = useApi(
    async () => {
      if (isOwner && skill) await skillService.publishVersion(skill.resourceId);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('toast.publishSuccess'));
        refreshSkill();
      },
    }
  );

  const { loading: versionLoading, run: switchVersion } = useApi(
    async (version: number) => {
      if (!isOwner || !skill) return null;
      return skillService.getSkillVersionFiles(skill.resourceId, version);
    },
    {
      manual: true,
      onSuccess: (data, params) => {
        if (data) onVersionFilesLoaded(data.files, params[0]);
      },
    }
  );

  const handleToggleEditing = () => {
    if (!isOwner) return;
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
    if (!isOwner) return;
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
    if (!isOwner) return;
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
    setPendingIntent(null);
  };

  const handleDiscardPendingIntent = () => {
    if (pendingIntent?.type === 'publish') {
      discardAndPublish();
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
