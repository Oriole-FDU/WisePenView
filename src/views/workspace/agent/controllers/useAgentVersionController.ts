import { useAgentService, useChatService, useSkillService } from '@/domains';
import type { AgentDetail } from '@/domains/Agent';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { getAgentVersionItems, type AgentWorkspaceData } from '../model';

interface UseAgentVersionControllerOptions {
  resourceId: string;
}

export function useAgentVersionController({ resourceId }: UseAgentVersionControllerOptions) {
  const agentService = useAgentService();
  const chatService = useChatService();
  const skillService = useSkillService();
  const [agentOverride, setAgentOverride] = useState<AgentDetail | null>(null);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [sourceRevision, setSourceRevision] = useState(0);

  const load = useRequest(
    async (): Promise<AgentWorkspaceData> => {
      const [sourceAgent, models, tools, skills] = await Promise.all([
        agentService.getAgentDetail(resourceId),
        chatService.getModels(),
        chatService.getTools(),
        skillService.getSkillSummaries(),
      ]);
      return {
        agent: sourceAgent,
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
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const data = load.data?.agent.resourceId === resourceId ? load.data : undefined;

  const switchVersion = useRequest(
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
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const selectVersion = (version: number) => {
    if (!data || version === (viewingVersion ?? data.agent.draftVersion)) return;
    switchVersion.run(version, resourceId);
  };

  const currentAgentOverride = agentOverride?.resourceId === resourceId ? agentOverride : undefined;
  const displayAgent = currentAgentOverride ?? data?.agent;
  const versionItems = getAgentVersionItems(data?.agent, viewingVersion);
  const disabledVersionKeys = data?.agent.isOwner
    ? new Set<string>()
    : new Set(versionItems.map((item) => item.key));

  return {
    data,
    disabledVersionKeys,
    displayAgent,
    error: load.error,
    loading: load.loading,
    refresh: load.refresh,
    selectVersion,
    sourceRevision,
    versionItems,
    versionLoading: switchVersion.loading,
    viewingVersion,
  };
}
