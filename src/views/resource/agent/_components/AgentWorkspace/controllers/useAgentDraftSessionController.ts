import { toast } from '@heroui/react';
import type { TFunction } from 'i18next';
import { useState } from 'react';

import { useAgentService } from '@/domains';
import type { AgentDetail, AgentSpec } from '@/domains/Agent';
import { useApi } from '@/hooks/useApi';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

import { buildGuidedPrompt, getDefaultGuidedPromptFields } from '../../../guidedPrompt';
import {
  type AgentDraft,
  buildAgentDraft,
  buildCurrentDraftAgent,
  snapshotAgentDraft,
} from '../../../model';

type AgentSavePhase = 'clean' | 'dirty' | 'saving' | 'failed';

interface UseAgentDraftSessionControllerOptions {
  agent: AgentDetail;
  baseAgent: AgentDetail;
  isOwner: boolean;
  onPublished: () => void;
  resourceId: string;
  t: TFunction<'agent' | 'common'>;
  versionLoading: boolean;
  viewingVersion: number | null;
}

export function useAgentDraftSessionController({
  agent,
  baseAgent,
  isOwner,
  onPublished,
  resourceId,
  t,
  versionLoading,
  viewingVersion,
}: UseAgentDraftSessionControllerOptions) {
  const agentService = useAgentService();
  const initialSavedDraft = buildAgentDraft(agent);
  const initialDraft =
    isOwner && viewingVersion === null && !initialSavedDraft.spec.systemPrompt
      ? {
          ...initialSavedDraft,
          spec: {
            ...initialSavedDraft.spec,
            systemPrompt: buildGuidedPrompt(getDefaultGuidedPromptFields(), true),
          },
        }
      : initialSavedDraft;
  const [draft, setDraftState] = useState(initialDraft);
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshotAgentDraft(initialSavedDraft));
  const [savePhase, setSavePhase] = useState<AgentSavePhase>(() =>
    snapshotAgentDraft(initialDraft) === snapshotAgentDraft(initialSavedDraft) ? 'clean' : 'dirty'
  );
  const isDirty = savePhase === 'dirty' || savePhase === 'failed';

  const setDraft = (updater: (current: AgentDraft) => AgentDraft) =>
    setDraftState((current) => {
      const next = updater(current);
      setSavePhase(snapshotAgentDraft(next) === savedSnapshot ? 'clean' : 'dirty');
      return next;
    });

  const saveRequest = useApi(
    async () => {
      if (!isOwner || viewingVersion !== null) return;
      setSavePhase('saving');
      await agentService.saveAgentDraft({
        resourceId,
        draftVersion: baseAgent.draftVersion,
        name: draft.name.trim(),
        description: draft.description.trim(),
        spec: draft.spec,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        setSavedSnapshot(snapshotAgentDraft(draft));
        setSavePhase('clean');
        toast.success(t('agent:page.saved'));
      },
      onErrorEffect: () => {
        setSavePhase('failed');
      },
    }
  );

  const publishRequest = useApi(
    async () => {
      if (!isOwner) return;
      if (isDirty) await saveRequest.runAsync();
      await agentService.publishVersion(resourceId);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('agent:page.published'));
        onPublished();
      },
    }
  );

  const unsavedChangesGuard = useUnsavedChangesGuard(isDirty);

  const saveAndLeave = async () => {
    try {
      await saveRequest.runAsync();
      unsavedChangesGuard.proceed();
    } catch {
      // 保存失败时保留当前页面，用户可以继续编辑。
    }
  };

  const saveDraftForDebug = async (): Promise<boolean> => {
    try {
      await saveRequest.runAsync();
      return true;
    } catch {
      return false;
    }
  };

  const setSpec = (spec: AgentSpec) => setDraft((current) => ({ ...current, spec }));
  const isReadOnly =
    !isOwner ||
    viewingVersion !== null ||
    saveRequest.loading ||
    publishRequest.loading ||
    versionLoading;

  return {
    cancelLeave: unsavedChangesGuard.reset,
    currentDraftAgent: buildCurrentDraftAgent(baseAgent, draft, t('agent:page.currentAgent')),
    discardLeave: unsavedChangesGuard.proceed,
    draft,
    isDirty,
    isLeaveBlocked: unsavedChangesGuard.isBlocked,
    isReadOnly,
    publishDraft: () => publishRequest.run(),
    publishLoading: publishRequest.loading,
    saveAndLeave,
    saveDraft: () => saveRequest.run(),
    saveDraftForDebug,
    saveLoading: saveRequest.loading,
    savePhase,
    setDescription: (description: string) => setDraft((current) => ({ ...current, description })),
    setName: (name: string) => setDraft((current) => ({ ...current, name })),
    setSpec,
    setSystemPrompt: (systemPrompt: string) =>
      setDraft((current) => ({
        ...current,
        spec: { ...current.spec, systemPrompt },
      })),
  };
}
