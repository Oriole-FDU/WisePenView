import type { ChatAgentOption } from '@/store';

export interface AgentSelectorProps {
  value: ChatAgentOption | null;
  options: ChatAgentOption[];
  onChange: (agent: ChatAgentOption) => void;
  compact?: boolean;
}
