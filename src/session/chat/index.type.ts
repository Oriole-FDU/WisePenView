interface ChatState {
  key: string;
  value: string;
  disabled?: boolean;
}

interface ChatAgentContext {
  agent_id: string;
  agent_type: 'PERSONAL' | 'GROUP';
  group_id?: string;
  advanced_mode_enabled: boolean;
  system_prompt_override?: string;
  tools?: string[];
}

interface ChatAttachmentRef {
  attachment_id: string;
  filename?: string;
  enabled: boolean;
  context_mode?: string;
}

interface ChatResourceRef {
  resource_id: string;
  enabled: boolean;
  context_mode?: string;
}

interface ChatRequestBody {
  session_id: string;
  query: string;
  model?: string;
  states?: ChatState[];
  attachment_refs?: ChatAttachmentRef[];
  resource_refs?: ChatResourceRef[];
  agent_context?: ChatAgentContext;
  allowed_skill_ids?: string[];
  selected_skill_ids?: string[];
}

interface UseChatSessionOptions {
  sessionId: string;
  model?: string;
  enableSelected?: boolean;
}

export type {
  ChatAgentContext,
  ChatAttachmentRef,
  ChatRequestBody,
  ChatResourceRef,
  ChatState,
  UseChatSessionOptions,
};
