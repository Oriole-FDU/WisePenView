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
  return {
    agentId: `agent-${item.resourceId}`,
    agentType: group ? 'GROUP' : 'PERSONAL',
    label: item.resourceName,
    source: 'RESOURCE',
    resourceId: item.resourceId,
    ...(group ? { groupId: group.groupId, groupName: group.groupName } : {}),
  };
};
