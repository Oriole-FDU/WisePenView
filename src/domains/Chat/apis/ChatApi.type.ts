export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  agent_id?: string | null;
  agent_version?: number | null;
}

export interface MessageResponse {
  id?: unknown;
  role?: unknown;
  metadata?: unknown;
  parts?: unknown;
  model_id?: unknown;
  content?: unknown;
  tool_calls?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  total_page: number;
}

export interface ListAvailableModelsApiResponse {
  system_models: ModelResponse[];
  user_models: ModelResponse[];
}

export type ModelScopeApi = 'SYSTEM' | 'USER';
export type ModelFamilyApi = 'QWEN' | 'GPT' | 'CLAUDE' | 'GEMINI' | 'GENERIC';

export interface ListModelsApiRequest {
  model_scope: ModelScopeApi;
}

export interface ListModelsApiResponse {
  models: ModelResponse[];
}

interface ToolSourceApiResponse {
  type: string;
  server_id: string | null;
  server_display_name: string | null;
  remote_name: string | null;
}

export interface ToolApiResponse {
  name: string;
  display_name: string;
  description: string;
  selection_mode: 'user_selectable' | 'contextual';
  requires_config: boolean;
  configured: boolean;
  enabled: boolean;
  source: ToolSourceApiResponse | null;
  missing_config_keys?: string[];
  config_schema: Record<string, unknown>;
  secret_fingerprints: Record<string, string>;
}

export interface ListToolsApiResponse {
  tools: ToolApiResponse[];
}

export type ProviderTypeApi = 'ALIBABA' | 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'OPENAI_COMPATIBLE';

export interface ProviderApiResponse {
  id: string;
  name: string;
  base_url?: string | null;
  api_key_fingerprint?: string | null;
  scope: 'SYSTEM' | 'USER';
  type: ProviderTypeApi;
  is_active: boolean;
  token_usage: number;
  billable_token_usage: number;
}

export interface ListUserProvidersApiResponse {
  providers: ProviderApiResponse[];
}

export interface CreateUserProviderApiRequest {
  name: string;
  type: ProviderTypeApi;
  api_key: string;
  base_url?: string | null;
  is_active?: boolean;
}

export interface UpdateUserProviderApiRequest {
  provider_id: string;
  name?: string;
  type?: ProviderTypeApi;
  api_key?: string;
  base_url?: string | null;
  is_active?: boolean;
}

export interface DeleteUserProviderApiRequest {
  provider_id: string;
}

export type UpdateUserProviderApiResponse = null;
export type DeleteUserProviderApiResponse = null;

export interface UpdateUserToolConfigApiRequest {
  tool_name: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
  secret_config?: Record<string, string>;
}

export type UpdateUserToolConfigApiResponse = ToolApiResponse;

export interface DeleteUserToolConfigApiRequest {
  tool_name: string;
}

export type DeleteUserToolConfigApiResponse = null;

export interface ActiveChatTurnApiRequest {
  session_id: string;
}

export interface ActiveChatTurnApiResponse {
  turn_id: string | null;
}

export interface CancelChatTurnApiRequest {
  session_id: string;
}

export type CancelChatTurnApiResponse = null;

export interface ModelProviderMappingResponse {
  model_id: string;
  provider_id: string;
  provider_name?: string | null;
  provider_model_name: string;
  input_billing_ratio: string;
  cached_input_billing_ratio: string;
  output_billing_ratio: string;
  support_runtime_options?: Record<string, unknown>;
  is_preferred: boolean;
  is_active: boolean;
  priority: number;
}

export interface ModelResponse {
  id: string;
  scope: ModelScopeApi;
  display_name: string;
  model_family: ModelFamilyApi;
  support_thinking: boolean;
  support_vision: boolean;
  support_tools: boolean;
  context_window_tokens?: number | null;
  max_output_tokens?: number | null;
  is_active: boolean;
  mappings?: ModelProviderMappingResponse[] | null;
}

export interface CreateUserModelApiRequest {
  display_name: string;
  model_family?: ModelFamilyApi;
  support_thinking?: boolean;
  support_vision?: boolean;
  support_tools?: boolean;
  context_window_tokens?: number | null;
  max_output_tokens?: number | null;
}

export interface UpdateUserModelApiRequest {
  model_id: string;
  display_name?: string;
  model_family?: ModelFamilyApi;
  support_thinking?: boolean;
  support_vision?: boolean;
  support_tools?: boolean;
  context_window_tokens?: number | null;
  max_output_tokens?: number | null;
  is_active?: boolean;
}

export interface DeleteUserModelApiRequest {
  model_id: string;
}

export interface BindModelProviderApiRequest {
  model_id: string;
  provider_id: string;
  provider_model_name: string;
  is_preferred?: boolean;
  is_active?: boolean;
}

export interface UnbindModelProviderApiRequest {
  model_id: string;
  provider_id: string;
}

export type CreateUserModelApiResponse = null;
export type UpdateUserModelApiResponse = null;
export type DeleteUserModelApiResponse = null;
export type BindModelProviderApiResponse = null;
export type UnbindModelProviderApiResponse = null;
export type CreateSessionApiRequest = {
  title?: string | null;
  agent_id?: string | null;
  agent_version?: number | null;
};
export type CreateSessionApiResponse = ChatSession;
export type SetSessionAgentApiRequest = {
  session_id: string;
  agent_id?: string | null;
  agent_version?: number | null;
};
export type SetSessionAgentApiResponse = ChatSession;
export type RenameSessionApiRequest = { session_id: string; new_title?: string | null };
export type RenameSessionApiResponse = ChatSession;
export type DeleteSessionApiRequest = { session_id: string };
export type DeleteSessionApiResponse = null;
export type ListSessionsApiRequest = { page?: number; size?: number };
export type ListSessionsApiResponse = PageResult<ChatSession>;
export type ListHistoryMessagesApiRequest = { session_id: string; page?: number; size?: number };
export type ListHistoryMessagesApiResponse = PageResult<MessageResponse>;

export interface InitTemporaryAttachmentUploadApiRequest {
  session_id: string;
  filename: string;
  extension: string;
  file_size: number;
  md5: string;
  enable_library?: boolean;
}

export interface InitTemporaryAttachmentUploadApiResponse {
  attachment_id: string;
  object_key: string;
  put_url?: string | null;
  callback_header?: string | null;
  flash_uploaded?: boolean;
}
