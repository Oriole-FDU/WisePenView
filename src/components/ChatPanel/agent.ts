import type { ChatAgentOption } from '@/store';
import type { Group } from '@/types/group';

const DEFAULT_PERSONAL_AGENT_ID = 'agent-personal-default';
const DEFAULT_PERSONAL_AGENT_LABEL = '默认Agent';

export const buildDefaultPersonalAgent = (): ChatAgentOption => ({
  agentId: DEFAULT_PERSONAL_AGENT_ID,
  agentType: 'PERSONAL',
  label: DEFAULT_PERSONAL_AGENT_LABEL,
  isDefault: true,
});

export const buildGroupAgent = (group: Group): ChatAgentOption => ({
  agentId: `agent-group-${group.groupId}`,
  agentType: 'GROUP',
  label: group.groupName,
  groupId: group.groupId,
  groupName: group.groupName,
});

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
    groupId,
    groupName: group.label,
  };
};
