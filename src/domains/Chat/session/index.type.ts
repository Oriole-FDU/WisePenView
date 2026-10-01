import type { FrontendStateEntry } from '@/frontendState/definitions';

interface ChatSelectedResourceContext {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  enabled: boolean;
}

interface ChatUploadedAttachmentContext {
  attachmentId: string;
  filename: string;
  enabled: boolean;
}

export interface ChatCompletionRequest {
  session_id: string;
  query: string;
  model?: string;
  provider_id?: string;
  runtime_options?: Record<string, unknown>;
  frontend_states?: FrontendStateEntry[];
  user_defined_attachment_ids?: string[];
  tool_selection_default_enabled: true;
  tool_selection_overrides?: Record<string, boolean>;
  user_defined_on_demand_skill_ids?: string[];
  client_tool_capabilities?: ClientToolCapabilityRequest[];
}

export interface ToolApprovalStatusRequest {
  tool_call_id: string;
  approved: boolean;
}

export type ChatRecoverRequest = {
  session_id: string;
  client_tool_results: [];
  tool_approval_status: ToolApprovalStatusRequest[];
};

export interface ClientToolCapability {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ClientToolCapabilityRequest {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface SendSessionMessageOptions {
  sessionId?: string;
  model?: string;
  providerId?: string;
  runtimeOptions?: Record<string, unknown>;
  frontendStates?: FrontendStateEntry[];
  selectedResources?: ChatSelectedResourceContext[];
  uploadedAttachments?: ChatUploadedAttachmentContext[];
  toolSelectionOverrides?: Record<string, boolean>;
  onDemandSkillIds?: string[];
  clientToolCapabilities?: ClientToolCapability[];
}

export interface UseChatSessionOptions {
  sessionId: string;
  model?: string;
  getActiveTurnId: (sessionId: string) => Promise<string | null>;
  onError?: (error: Error) => void;
}
