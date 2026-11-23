import type { ChatAgentOption } from '@/domains/ChatConfig';

export interface AgentPickerProps {
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
}
