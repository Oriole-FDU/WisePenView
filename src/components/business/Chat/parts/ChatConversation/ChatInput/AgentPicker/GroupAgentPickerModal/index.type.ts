import type { ChatAgentOption } from '@/domains/ChatConfig';

export interface GroupAgentPickerModalProps {
  open: boolean;
  selectedAgentId: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (agent: ChatAgentOption) => void;
}
