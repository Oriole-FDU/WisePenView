import type { AgentDetail, IAgentService } from '@/domains/Agent';
import type { ChatModel, IChatService, ToolOption } from '@/domains/Chat';
import type { ISkillService, SkillSummary } from '@/domains/Skill';
import type { AgentDraft } from '../_hooks/useAgentWorkspaceController';
import { buildGuidedPrompt, getDefaultGuidedPromptFields } from '../systemPrompt';

export interface AgentEditorData {
  agent: AgentDetail;
  models: ChatModel[];
  tools: ToolOption[];
  skills: SkillSummary[];
  savedDraft?: AgentDraft;
}

interface LoadAgentEditorDataParams {
  resourceId: string;
  agentService: IAgentService;
  chatService: IChatService;
  skillService: ISkillService;
}

export async function loadAgentEditorData({
  resourceId,
  agentService,
  chatService,
  skillService,
}: LoadAgentEditorDataParams): Promise<AgentEditorData> {
  const [agent, models, tools, skills] = await Promise.all([
    agentService.getAgentDetail(resourceId),
    chatService.getModels(),
    chatService.getTools(),
    skillService.getSkillSummaries(),
  ]);

  const savedDraft: AgentDraft = {
    name: agent.name,
    description: agent.description,
    spec: structuredClone(agent.spec),
  };
  const usesDefaultPrompt = !agent.spec.systemPrompt;
  if (usesDefaultPrompt) {
    agent.spec.systemPrompt = buildGuidedPrompt(getDefaultGuidedPromptFields(), true);
  }

  return {
    agent,
    models,
    tools,
    skills,
    savedDraft: usesDefaultPrompt ? savedDraft : undefined,
  };
}
