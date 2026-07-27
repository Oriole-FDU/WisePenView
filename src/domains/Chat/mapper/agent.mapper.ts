import type { ResourceItem } from '@/domains/Resource';
import type { ChatAgentOption } from '../entity/agent';

const DEFAULT_PERSONAL_AGENT_ID = 'agent-personal-default';

export const buildDefaultPersonalAgent = (): ChatAgentOption => ({
  agentId: DEFAULT_PERSONAL_AGENT_ID,
  agentType: 'PERSONAL',
  label: '',
  source: 'DEFAULT',
  isDefault: true,
});

export const buildAgentFromResourceItem = (
  item: ResourceItem,
  group?: { groupId: string; groupName: string }
): ChatAgentOption => {
  const raw = item as ResourceItem & { defaultSkillIds?: string[] };
  return {
    agentId: `agent-${item.resourceId}`,
    agentType: group ? 'GROUP' : 'PERSONAL',
    label: item.resourceName,
    source: 'RESOURCE',
    resourceId: item.resourceId,
    ...(group ? { groupId: group.groupId, groupName: group.groupName } : {}),
    defaultSkillIds: raw.defaultSkillIds,
  };
};

export const buildAgentFromSkillTreeGroup = (
  group: { key: string; label: string },
  currentAgent: ChatAgentOption | null
): ChatAgentOption | null => {
  if (group.key === 'personal') {
    return buildDefaultPersonalAgent();
  }
  const groupId = group.key.replace(/^group-/, '');
  return {
    agentId: currentAgent?.groupId === groupId ? currentAgent.agentId : `agent-group-${groupId}`,
    agentType: 'GROUP',
    label: group.label,
    source: 'RESOURCE',
    groupId,
    groupName: group.label,
  };
};

export const buildChatInputAgentOptions = (
  agents: ChatAgentOption[],
  currentAgent: ChatAgentOption
): ChatAgentOption[] => (agents.length > 0 ? agents : [currentAgent]);

export const resolveChatInputSelectedAgent = (
  agents: ChatAgentOption[],
  currentAgent: ChatAgentOption
): ChatAgentOption =>
  agents.find((agent) => agent.agentId === currentAgent.agentId) ?? agents[0] ?? currentAgent;
