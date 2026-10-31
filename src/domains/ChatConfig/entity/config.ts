export interface ToolOption {
  toolId: string;
  label: string;
  displayName: string;
  description: string;
  selectionMode: 'user_selectable' | 'contextual';
  enabled: boolean;
  configured: boolean;
  requiresConfig: boolean;
  source: {
    type: string;
    serverId: string | null;
    serverDisplayName: string | null;
    remoteName: string | null;
  } | null;
  configSchema: Record<string, unknown>;
  secretFingerprints: Record<string, string>;
}

export interface CapabilityToolOption {
  toolId: string;
  label: string;
}

export type ChatProviderType = 'ALIBABA' | 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'OPENAI_COMPATIBLE';

export interface ChatProvider {
  id: string;
  name: string;
  baseUrl: string | null;
  apiKeyFingerprint: string | null;
  scope: 'SYSTEM' | 'USER';
  type: ChatProviderType;
  isActive: boolean;
  inputTokenUsage: number;
  cachedInputTokenUsage: number;
  outputTokenUsage: number;
  billableTokenUsage: number;
}

export type ChatModelFamily = 'QWEN' | 'GPT' | 'CLAUDE' | 'GEMINI' | 'GENERIC';
export type ChatModelScope = 'SYSTEM' | 'USER';

export interface ChatModelConfigProviderMapping {
  providerId: string;
  providerName: string | null;
  providerModelName: string;
  inputBillingRatio: string;
  cachedInputBillingRatio: string;
  outputBillingRatio: string;
  isPreferred: boolean;
  isActive: boolean;
  priority: number;
}

export interface ChatModelConfig {
  id: string;
  scope: ChatModelScope;
  displayName: string;
  modelFamily: ChatModelFamily;
  supportThinking: boolean;
  supportVision: boolean;
  supportTools: boolean;
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  isActive: boolean;
  mappings: ChatModelConfigProviderMapping[];
}

export interface ChatModelTag {
  text: string;
  type: string;
}

export interface ChatModelProviderOption {
  providerId: string;
  providerName?: string | null;
  providerModelName: string;
  inputBillingRatio?: string;
  cachedInputBillingRatio?: string;
  outputBillingRatio?: string;
  provider: string;
  supportRuntimeOptions: Record<string, unknown>;
  isPreferred: boolean;
  isActive: boolean;
  priority: number;
}

export interface ChatModel {
  /** 前端选择项 ID；同一个模型存在多个 provider mapping 时用于区分选项。 */
  id: string;
  /** 后端模型 ID；发送 `/chat/completions` 时使用。 */
  modelId: string;
  name: string;
  provider: string;
  providerId?: string;
  providerName?: string | null;
  providerModelName?: string;
  providerOptions: ChatModelProviderOption[];
  scope: string;
  modelFamily: string;
  isFree: boolean;
  supportThinking: boolean;
  supportTools: boolean;
  tags: ChatModelTag[];
  isDefault: boolean;
  vision: boolean;
  usageRank: number;
  contextWindowTokens?: number | null;
  maxOutputTokens?: number | null;
}
