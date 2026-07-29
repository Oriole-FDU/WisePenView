import type { SkillDetail, SkillFileNode } from '@/domains/Skill';
import type { TFunction } from 'i18next';

import { canPreviewSkillFile, findFile, getFirstFile } from './utils/skillFileTree';

export type SkillSavePhase = 'clean' | 'dirty' | 'saving' | 'failed';

export type SkillConfigBadge = 'required' | 'unsaved' | 'complete';

export function selectSkillFile(
  files: SkillFileNode[],
  selectedFileId: string,
  isConfigSelected: boolean
): SkillFileNode | null {
  if (isConfigSelected) return null;
  if (selectedFileId) return findFile(files, selectedFileId);
  return getFirstFile(files);
}

export function canEditSkill(
  skill: SkillDetail | undefined,
  viewingVersion: number | null
): boolean {
  return Boolean(skill?.isOwner && skill.draftVersion === viewingVersion);
}

export function getSkillVersionItems(
  skill: SkillDetail | undefined,
  viewingVersion: number | null
) {
  if (!skill) return [];
  const items = [
    {
      key: `v${skill.draftVersion}`,
      version: skill.draftVersion,
      current: viewingVersion === skill.draftVersion,
    },
  ];
  for (let version = skill.version; version >= 1; version -= 1) {
    items.push({
      key: `v${version}`,
      version,
      current: viewingVersion === version,
    });
  }
  return items;
}

export function getDisabledSkillVersionKeys(
  skill: SkillDetail | undefined,
  versionItems: Array<{ key: string }>
): Set<string> {
  return skill?.isOwner ? new Set<string>() : new Set(versionItems.map((item) => item.key));
}

export function getSkillConfigBadge(
  hasConfigValuesMissing: boolean,
  isConfigDirty: boolean
): SkillConfigBadge {
  if (hasConfigValuesMissing) return 'required';
  if (isConfigDirty) return 'unsaved';
  return 'complete';
}

export function canPreviewSelectedSkillFile(file: SkillFileNode | null): boolean {
  return file ? canPreviewSkillFile(file) : false;
}

export function formatSkillSaveStatus(
  status: SkillSavePhase | undefined,
  t: TFunction<'skill'>
): string | null {
  if (status === 'dirty') return t('saveStatus.dirty');
  if (status === 'saving') return t('saveStatus.saving');
  if (status === 'failed') return t('saveStatus.failed');
  if (status === 'clean') return t('saveStatus.clean');
  return null;
}

interface ResolveSkillSavePhaseOptions {
  hasUnsavedChanges: boolean;
  hasFailedItems: boolean;
  isSaving: boolean;
}

export function resolveSkillSavePhase({
  hasUnsavedChanges,
  hasFailedItems,
  isSaving,
}: ResolveSkillSavePhaseOptions): SkillSavePhase {
  if (isSaving) return 'saving';
  if (hasFailedItems) return 'failed';
  if (hasUnsavedChanges) return 'dirty';
  return 'clean';
}
