export interface ChatFrontendState<Key extends string = string, Value = unknown> {
  key: Key;
  value: Value;
  disabled?: boolean;
}

export interface ChatClientToolCapability {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ChatClientToolCapabilityRequest {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ClientToolCallEvent {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export type ClientToolExecutionResult =
  | {
      toolCallId: string;
      output: unknown;
      errorText?: never;
    }
  | {
      toolCallId: string;
      output?: never;
      errorText: string;
    };

export type ClientToolCallHandler = (
  event: ClientToolCallEvent
) => ClientToolExecutionResult | Promise<ClientToolExecutionResult>;

export interface ClientToolResultSubmission {
  tool_call_id: string;
  output?: unknown;
  error_text?: string;
}

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
  frontend_states?: ChatFrontendState[];
  user_defined_attachment_ids?: string[];
  user_defined_allow_tool_names?: string[];
  user_defined_deny_tool_names?: string[];
  user_defined_on_demand_skill_ids?: string[];
  user_defined_force_enabled_skill_ids?: string[];
  client_tool_capabilities?: ChatClientToolCapabilityRequest[];
}

export interface SendSessionMessageOptions {
  sessionId?: string;
  model?: string;
  providerId?: string;
  runtimeOptions?: Record<string, unknown>;
  frontendStates?: ChatFrontendState[];
  selectedResources?: ChatSelectedResourceContext[];
  uploadedAttachments?: ChatUploadedAttachmentContext[];
  allowToolNames?: string[];
  denyToolNames?: string[];
  onDemandSkillIds?: string[];
  forceEnabledSkillIds?: string[];
  clientToolCapabilities?: ChatClientToolCapability[];
}

export interface UseChatSessionOptions {
  sessionId: string;
  model?: string;
  onClientToolCall?: ClientToolCallHandler;
}
