import { useState } from 'react';

import { useAgentService, useChatService, useSkillService, useUserService } from '@/domains';
import type { AgentDetail } from '@/domains/Agent';
import { useApi } from '@/hooks/useApi';

import { type AgentWorkspaceData, getAgentVersionItems } from '../model';

interface UseAgentVersionControllerOptions {
  resourceId: string;
}

export function useAgentVersionController({ resourceId }: UseAgentVersionControllerOptions) {
  const agentService = useAgentService();
  const chatService = useChatService();
  const skillService = useSkillService();
  const userService = useUserService();
  const [agentOverride, setAgentOverride] = useState<AgentDetail | null>(null);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [sourceRevision, setSourceRevision] = useState(0);

  const load = useApi(
    async (): Promise<AgentWorkspaceData> => {
      const currentUser = await userService.getUserInfo();
      const baseAgent = await agentService.getAgentDetail(resourceId);
      const isOwner = Boolean(baseAgent.ownerId && baseAgent.ownerId === currentUser.id);
      const [sourceAgent, models, tools, skills] = await Promise.all([
        isOwner && baseAgent.draftVersion > 0
          ? agentService.getAgentDetail(resourceId, baseAgent.draftVersion)
          : Promise.resolve(baseAgent),
        chatService.getModels(),
        chatService.getTools(),
        skillService.getSkillSummaries(),
      ]);
      return {
        agent: sourceAgent,
        isOwner,
        models,
        tools,
        skills,
      };
    },
    {
      refreshDeps: [resourceId],
      onSuccess: (data) => {
        if (data.agent.resourceId !== resourceId) return;
        setAgentOverride(null);
        setViewingVersion(null);
        setSourceRevision((revision) => revision + 1);
      },
    }
  );
  const data = load.data?.agent.resourceId === resourceId ? load.data : undefined;

  const switchVersion = useApi(
    async (version: number, targetResourceId: string) => {
      return agentService.getAgentDetail(targetResourceId, version);
    },
    {
      manual: true,
      onSuccess: (agent, params) => {
        const [version, targetResourceId] = params;
        if (!agent || targetResourceId !== resourceId) return;
        const isDraft = data?.agent.draftVersion === version;
        setViewingVersion(isDraft ? null : version);
        setAgentOverride(agent);
        setSourceRevision((revision) => revision + 1);
      },
    }
  );

  const selectVersion = (version: number) => {
    if (!data?.isOwner || version === (viewingVersion ?? data.agent.draftVersion)) return;
    switchVersion.run(version, resourceId);
  };

  const currentAgentOverride = agentOverride?.resourceId === resourceId ? agentOverride : undefined;
  const displayAgent = currentAgentOverride ?? data?.agent;
  const versionItems = getAgentVersionItems(data?.agent, viewingVersion);
  const disabledVersionKeys = data?.isOwner
    ? new Set<string>()
    : new Set(versionItems.map((item) => item.key));

  return {
    data,
    disabledVersionKeys,
    displayAgent,
    error: load.error,
    isOwner: data?.isOwner ?? false,
    loading: load.loading,
    refresh: load.refresh,
    selectVersion,
    sourceRevision,
    versionItems,
    versionLoading: switchVersion.loading,
    viewingVersion,
  };
}
