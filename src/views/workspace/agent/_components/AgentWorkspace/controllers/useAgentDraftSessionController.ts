import { useAgentService } from '@/domains';
import type { AgentDetail, AgentSpec } from '@/domains/Agent';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { buildGuidedPrompt, getDefaultGuidedPromptFields } from '../../../guidedPrompt';
import {
  buildAgentDraft,
  buildCurrentDraftAgent,
  snapshotAgentDraft,
  type AgentDraft,
} from '../../../model';

type AgentSavePhase = 'clean' | 'dirty' | 'saving' | 'failed';

interface UseAgentDraftSessionControllerOptions {
  agent: AgentDetail;
  baseAgent: AgentDetail;
  onPublished: () => void;
  resourceId: string;
  t: TFunction<'agent' | 'common'>;
  versionLoading: boolean;
  viewingVersion: number | null;
}

export function useAgentDraftSessionController({
  agent,
  baseAgent,
  onPublished,
  resourceId,
  t,
  versionLoading,
  viewingVersion,
}: UseAgentDraftSessionControllerOptions) {
  const agentService = useAgentService();
  const initialSavedDraft = buildAgentDraft(agent);
  const initialDraft =
    viewingVersion === null && !initialSavedDraft.spec.systemPrompt
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

  const saveRequest = useRequest(
    async () => {
      if (viewingVersion !== null) return;
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
      onError: (error) => {
        setSavePhase('failed');
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const publishRequest = useRequest(
    async () => {
      if (isDirty) await saveRequest.runAsync();
      await agentService.publishVersion(resourceId);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('agent:page.published'));
        onPublished();
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const blocker = useBlocker(isDirty);
  useBeforeUnload((event) => {
    if (isDirty) event.preventDefault();
  });

  const saveAndLeave = async () => {
    try {
      await saveRequest.runAsync();
      blocker.proceed?.();
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
    !baseAgent.isOwner ||
    viewingVersion !== null ||
    saveRequest.loading ||
    publishRequest.loading ||
    versionLoading;

  return {
    cancelLeave: () => blocker.reset?.(),
    currentDraftAgent: buildCurrentDraftAgent(baseAgent, draft, t('agent:page.currentAgent')),
    discardLeave: () => blocker.proceed?.(),
    draft,
    isDirty,
    isLeaveBlocked: blocker.state === 'blocked',
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
