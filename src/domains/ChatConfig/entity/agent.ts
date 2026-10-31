export type ChatAgentType = 'PERSONAL' | 'GROUP';
export type ChatAgentSource = 'DEFAULT' | 'RESOURCE' | 'CURRENT_DRAFT';

export interface ChatAgentOption {
  agentId: string;
  agentType: ChatAgentType;
  label: string;
  source?: ChatAgentSource;
  resourceId?: string;
  agentVersion?: number;
  groupId?: string;
  groupName?: string;
  isDefault?: boolean;
}
