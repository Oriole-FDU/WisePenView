import type { ChatAgentOption } from '@/domains/ChatConfig';

export interface AgentPickerProps {
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
}

export interface GroupAgentPickerModalProps {
  open: boolean;
  selectedAgentId: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (agent: ChatAgentOption) => void;
}

export type AgentMenuSkeletonProps = { ariaLabel: string };
