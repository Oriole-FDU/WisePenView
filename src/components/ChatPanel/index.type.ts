import type { ChatAgentOption } from '@/domains/Chat';
import type { ResourceChatProtocolPort } from './ResourceChatProtocol';

export interface ChatPanelProps {
  fullWidth?: boolean;
  showHeader?: boolean;
  onNewChat?: () => void;
  resourceChat?: ResourceChatProtocolPort;
  agentDebug?: ChatPanelAgentDebugConfig;
  showCollapseButton?: boolean;
}

export interface ChatPanelAgentDebugConfig {
  agent: ChatAgentOption;
  isDirty: boolean;
  isSaving?: boolean;
  onSaveDraft: () => boolean | Promise<boolean>;
}
