import type { SkillDetail, SkillFileNode } from '@/domains/Skill';
import i18n from '@/i18n';
import { useReducer, useState, type SetStateAction } from 'react';

import type { SkillSaveQueueItem } from '../_components/SkillSaveQueueDock/index.type';
import type { SkillDraftCacheSnapshot } from '../utils/skillDraftCache';

export type SkillEditorSavePhase = 'clean' | 'dirty' | 'saving' | 'failed';

export type SkillEditorPendingIntent =
  | { type: 'publish' }
  | { type: 'leave' }
  | { type: 'switchFile'; fileId: string }
  | { type: 'switchConfig' }
  | { type: 'switchVersion'; version: number }
  | null;

export interface SkillEditorState {
  files: SkillFileNode[];
  selectedFileId: string;
  selectedTreeNodeId: string;
  viewingVersion: number | null;
  editing: boolean;
  editorContent: string;
  savedContent: string;
  configName: string;
  configDescription: string;
  savedConfigName: string;
  savedConfigDescription: string;
  saveQueueItems: SkillSaveQueueItem[];
  pendingIntent: SkillEditorPendingIntent;
}

export interface SkillEditorActions {
  setFiles: (value: SetStateAction<SkillFileNode[]>) => void;
  setSelectedFileId: (value: SetStateAction<string>) => void;
  setSelectedTreeNodeId: (value: SetStateAction<string>) => void;
  setViewingVersion: (value: SetStateAction<number | null>) => void;
  setEditing: (value: SetStateAction<boolean>) => void;
  setEditorContent: (value: SetStateAction<string>) => void;
  setSavedContent: (value: SetStateAction<string>) => void;
  setConfigName: (value: SetStateAction<string>) => void;
  setConfigDescription: (value: SetStateAction<string>) => void;
  setSavedConfigName: (value: SetStateAction<string>) => void;
  setSavedConfigDescription: (value: SetStateAction<string>) => void;
  setSaveQueueItems: (value: SetStateAction<SkillSaveQueueItem[]>) => void;
  setPendingIntent: (intent: SkillEditorPendingIntent) => void;
  initialize: (skill: SkillDetail) => void;
  restoreDraft: (snapshot: SkillDraftCacheSnapshot, skill: SkillDetail) => void;
  discardLocalChanges: (skill: SkillDetail) => void;
}

type SkillEditorAction =
  | { type: 'update'; update: (state: SkillEditorState) => SkillEditorState }
  | { type: 'setPendingIntent'; intent: SkillEditorPendingIntent }
  | { type: 'initialize'; skill: SkillDetail }
  | { type: 'restoreDraft'; snapshot: SkillDraftCacheSnapshot; skill: SkillDetail }
  | { type: 'discardLocalChanges'; skill: SkillDetail };

const INITIAL_STATE: SkillEditorState = {
  files: [],
  selectedFileId: '',
  selectedTreeNodeId: '',
  viewingVersion: null,
  editing: false,
  editorContent: '',
  savedContent: '',
  configName: '',
  configDescription: '',
  savedConfigName: '',
  savedConfigDescription: '',
  saveQueueItems: [],
  pendingIntent: null,
};

function resolveValue<T>(current: T, value: SetStateAction<T>): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(current) : value;
}

function recoverInterruptedQueue(items: SkillSaveQueueItem[]): SkillSaveQueueItem[] {
  return items.map((item) =>
    item.phase === 'preparing' || item.phase === 'uploading'
      ? {
          ...item,
          phase: 'failed',
          errorMessage: i18n.t('queue.interrupted', { ns: 'skill' }),
        }
      : item
  );
}

function skillEditorReducer(state: SkillEditorState, action: SkillEditorAction): SkillEditorState {
  if (action.type === 'update') return action.update(state);

  if (action.type === 'setPendingIntent') {
    return { ...state, pendingIntent: action.intent };
  }

  if (action.type === 'initialize') {
    const { skill } = action;
    return {
      ...INITIAL_STATE,
      files: skill.files,
      viewingVersion: skill.draftVersion,
      configName: skill.skillName,
      configDescription: skill.description,
      savedConfigName: skill.skillName,
      savedConfigDescription: skill.description,
    };
  }

  if (action.type === 'restoreDraft') {
    const { snapshot, skill } = action;
    return {
      ...state,
      files: snapshot.files,
      selectedFileId: snapshot.selectedFileId,
      selectedTreeNodeId: snapshot.selectedTreeNodeId,
      viewingVersion: snapshot.viewingVersion ?? skill.draftVersion,
      editing: Boolean(snapshot.selectedFileId),
      configName: snapshot.configName ?? skill.skillName,
      configDescription: snapshot.configDescription ?? skill.description,
      savedConfigName: snapshot.savedConfigName ?? skill.skillName,
      savedConfigDescription: snapshot.savedConfigDescription ?? skill.description,
      saveQueueItems: recoverInterruptedQueue(snapshot.saveQueueItems),
      pendingIntent: null,
    };
  }

  const { skill } = action;
  return {
    ...state,
    files: skill.files,
    selectedFileId: '',
    selectedTreeNodeId: '',
    editing: false,
    editorContent: state.savedContent,
    configName: state.savedConfigName,
    configDescription: state.savedConfigDescription,
    saveQueueItems: [],
    pendingIntent: null,
  };
}

interface ResolveSavePhaseOptions {
  isFileDirty: boolean;
  isConfigDirty: boolean;
  hasUnsavedLocalAssets: boolean;
  saveQueueItems: SkillSaveQueueItem[];
  isSaving: boolean;
}

export function resolveSkillEditorSavePhase({
  isFileDirty,
  isConfigDirty,
  hasUnsavedLocalAssets,
  saveQueueItems,
  isSaving,
}: ResolveSavePhaseOptions): SkillEditorSavePhase {
  if (isSaving) return 'saving';
  if (saveQueueItems.some((item) => item.phase === 'failed')) return 'failed';
  if (isFileDirty || isConfigDirty || hasUnsavedLocalAssets) return 'dirty';
  return 'clean';
}

export function useSkillEditorController() {
  const [state, dispatch] = useReducer(skillEditorReducer, INITIAL_STATE);
  const [actions] = useState<SkillEditorActions>(() => {
    const setField = <K extends Exclude<keyof SkillEditorState, 'pendingIntent'>>(
      field: K,
      value: SetStateAction<SkillEditorState[K]>
    ) => {
      dispatch({
        type: 'update',
        update: (current) => ({
          ...current,
          [field]: resolveValue(current[field], value),
        }),
      });
    };

    return {
      setFiles: (value: SetStateAction<SkillFileNode[]>) => setField('files', value),
      setSelectedFileId: (value: SetStateAction<string>) => setField('selectedFileId', value),
      setSelectedTreeNodeId: (value: SetStateAction<string>) =>
        setField('selectedTreeNodeId', value),
      setViewingVersion: (value: SetStateAction<number | null>) =>
        setField('viewingVersion', value),
      setEditing: (value: SetStateAction<boolean>) => setField('editing', value),
      setEditorContent: (value: SetStateAction<string>) => setField('editorContent', value),
      setSavedContent: (value: SetStateAction<string>) => setField('savedContent', value),
      setConfigName: (value: SetStateAction<string>) => setField('configName', value),
      setConfigDescription: (value: SetStateAction<string>) => setField('configDescription', value),
      setSavedConfigName: (value: SetStateAction<string>) => setField('savedConfigName', value),
      setSavedConfigDescription: (value: SetStateAction<string>) =>
        setField('savedConfigDescription', value),
      setSaveQueueItems: (value: SetStateAction<SkillSaveQueueItem[]>) =>
        setField('saveQueueItems', value),
      setPendingIntent: (intent: SkillEditorPendingIntent) =>
        dispatch({ type: 'setPendingIntent', intent }),
      initialize: (skill: SkillDetail) => dispatch({ type: 'initialize', skill }),
      restoreDraft: (snapshot: SkillDraftCacheSnapshot, skill: SkillDetail) =>
        dispatch({ type: 'restoreDraft', snapshot, skill }),
      discardLocalChanges: (skill: SkillDetail) => dispatch({ type: 'discardLocalChanges', skill }),
    };
  });

  return { state, actions };
}
