import { toast } from '@heroui/react';
import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';

import { useAgentService } from '@/domains';
import type { AgentDetail, AgentSpec } from '@/domains/Agent';
import { useApi } from '@/hooks/useApi';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';

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
  const initialDraft = initialSavedDraft;
  const savedSnapshotRef = useRef(snapshotAgentDraft(initialSavedDraft));
  const [draft, setDraftState] = useState(initialDraft);

  const saveRequest = useApi(
    async (draftSnapshot: AgentDraft) => {
      if (!isOwner || viewingVersion !== null) return;
      await agentService.saveAgentDraft({
        resourceId,
        draftVersion: baseAgent.draftVersion,
        name: draftSnapshot.name.trim(),
        description: draftSnapshot.description.trim(),
        spec: draftSnapshot.spec,
      });
      return snapshotAgentDraft(draftSnapshot);
    },
    {
      manual: true,
      showErrorToast: false,
    }
  );

  const autoSave = useDebouncedSave<AgentDraft>({
    canSave: () => isOwner && viewingVersion === null,
    save: async (draftSnapshot) => {
      await saveRequest.runAsync(draftSnapshot);
    },
    onSuccess: (savedDraft) => {
      savedSnapshotRef.current = snapshotAgentDraft(savedDraft);
    },
  });
  const savePhase: AgentSavePhase =
    autoSave.status === 'scheduled'
      ? 'dirty'
      : autoSave.status === 'saving'
        ? 'saving'
        : autoSave.status === 'failed'
          ? 'failed'
          : 'clean';
  const isDirty = autoSave.status !== 'idle';

  const setDraft = (updater: (current: AgentDraft) => AgentDraft) =>
    setDraftState((current) => {
      const next = updater(current);
      const nextSnapshot = snapshotAgentDraft(next);
      if (nextSnapshot === savedSnapshotRef.current) {
        if (autoSave.status === 'saving') {
          autoSave.schedule(structuredClone(next));
        } else {
          autoSave.cancel();
        }
      } else {
        autoSave.schedule(structuredClone(next));
      }
      return next;
    });

  const saveDraftRequest = () => autoSave.flush();

  const publishRequest = useApi(
    async () => {
      if (!isOwner) return;
      if (isDirty) await saveDraftRequest();
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

  const saveDraftForDebug = async (): Promise<boolean> => {
    try {
      await saveDraftRequest();
      return true;
    } catch {
      return false;
    }
  };

  const setSpec = (spec: AgentSpec) => setDraft((current) => ({ ...current, spec }));
  const isReadOnly =
    !isOwner || viewingVersion !== null || publishRequest.loading || versionLoading;

  return {
    currentDraftAgent: buildCurrentDraftAgent(baseAgent, draft, t('agent:page.currentAgent')),
    draft,
    isDirty,
    isReadOnly,
    publishDraft: () => publishRequest.run(),
    publishLoading: publishRequest.loading,
    saveDraftForDebug,
    saveDraftRequest,
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
