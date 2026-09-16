import type { Group, IGroupService } from '@/domains/Group';
import type { IResourceService, ResourceSkillSummary } from '@/domains/Resource';

import type { ChatAgentOption } from '../entity/agent';
import type { WisePenUIMessage } from '../entity/message';
import type { CapabilityToolOption } from '../mapper/capabilityPicker.mapper';

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

export type ChatProviderType = 'ALIBABA' | 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'OPENAI_COMPATIBLE';

export interface ChatProvider {
  id: string;
  name: string;
  baseUrl: string | null;
  apiKeyFingerprint: string | null;
  scope: 'SYSTEM' | 'USER';
  type: ChatProviderType;
  isActive: boolean;
  tokenUsage: number;
  billableTokenUsage: number;
}

export interface CreateChatProviderRequest {
  name: string;
  type: ChatProviderType;
  apiKey: string;
  baseUrl?: string | null;
  isActive?: boolean;
}

export interface UpdateChatProviderRequest {
  providerId: string;
  name?: string;
  type?: ChatProviderType;
  apiKey?: string;
  baseUrl?: string | null;
  isActive?: boolean;
}

export type ChatModelFamily = 'QWEN' | 'GPT' | 'CLAUDE' | 'GEMINI' | 'GENERIC';
export type ChatModelScope = 'SYSTEM' | 'USER';

export interface ChatModelConfigProviderMapping {
  providerId: string;
  providerName: string | null;
  providerModelName: string;
  isPreferred: boolean;
  isActive: boolean;
  priority: number;
}

export interface ChatModelConfig {
  id: string;
  scope: ChatModelScope;
  displayName: string;
  modelFamily: ChatModelFamily;
  billingRatio: number;
  supportThinking: boolean;
  supportVision: boolean;
  supportTools: boolean;
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  isActive: boolean;
  mappings: ChatModelConfigProviderMapping[];
}

export interface CreateChatUserModelRequest {
  displayName: string;
  modelFamily?: ChatModelFamily;
  billingRatio?: number;
  supportThinking?: boolean;
  supportVision?: boolean;
  supportTools?: boolean;
  contextWindowTokens?: number | null;
  maxOutputTokens?: number | null;
}

export interface UpdateChatUserModelRequest {
  modelId: string;
  displayName?: string;
  modelFamily?: ChatModelFamily;
  billingRatio?: number;
  supportThinking?: boolean;
  supportVision?: boolean;
  supportTools?: boolean;
  contextWindowTokens?: number | null;
  maxOutputTokens?: number | null;
  isActive?: boolean;
}

export interface BindChatModelProviderRequest {
  modelId: string;
  providerId: string;
  providerModelName: string;
  isPreferred?: boolean;
  isActive?: boolean;
}

export interface ChatModelTag {
  text: string;
  type: string;
}

export interface ChatModelProviderOption {
  providerId: string;
  providerName?: string | null;
  providerModelName: string;
  provider: string;
  supportRuntimeOptions: Record<string, unknown>;
  isPreferred: boolean;
  isActive: boolean;
  priority: number;
}

export interface ChatModel {
  /** 前端选择项 ID；同一个模型存在多个 provider mapping 时用于区分选项 */
  id: string;
  /** 后端模型 ID；发送 /chat/completions 时使用 */
  modelId: string;
  name: string;
  provider: string;
  providerId?: string;
  providerName?: string | null;
  providerModelName?: string;
  providerOptions: ChatModelProviderOption[];
  scope: string;
  modelFamily: string;
  ratio: number;
  supportThinking: boolean;
  supportTools: boolean;
  tags: ChatModelTag[];
  isDefault: boolean;
  vision: boolean;
  usageRank: number;
  contextWindowTokens?: number | null;
  maxOutputTokens?: number | null;
}

export interface UploadAttachmentParams {
  sessionId: string;
  file: File;
  saveToLibrary?: boolean;
}

export interface UploadAttachmentResult {
  attachmentId: string;
  filename?: string;
}

export interface ChatServiceDeps {
  groupService: IGroupService;
  resourceService: IResourceService;
}

export interface ChatInputCapabilityOptions {
  primarySkills: ResourceSkillSummary[];
  tools: CapabilityToolOption[];
}

export type ChatInputResourceScope = 'PERSONAL' | 'GROUP';

export interface GetChatInputCapabilityOptionsParams {
  agent: ChatAgentOption | null;
}

export interface ListChatInputGroupsRequest {
  page: number;
  size: number;
}

export interface ListChatInputAgentsRequest {
  scope: ChatInputResourceScope;
  page: number;
  size: number;
  groupId?: string;
  groupName?: string;
}

export interface ListChatInputSkillsRequest {
  scope: ChatInputResourceScope;
  page: number;
  size: number;
  groupId?: string;
  groupName?: string;
}

/** ChatService 接口 */
export interface IChatService {
  getModels(): Promise<ChatModel[]>;
  getActiveTurnId(sessionId: string): Promise<string | null>;
  cancelTurn(sessionId: string): Promise<void>;
  listChatInputGroups(params: ListChatInputGroupsRequest): Promise<PageResult<Group>>;
  listChatInputAgents(params: ListChatInputAgentsRequest): Promise<PageResult<ChatAgentOption>>;
  listChatInputSkills(
    params: ListChatInputSkillsRequest
  ): Promise<PageResult<ResourceSkillSummary>>;
  getChatInputCapabilityOptions(
    params: GetChatInputCapabilityOptionsParams
  ): Promise<ChatInputCapabilityOptions>;
  createSession(params?: CreateSessionRequest): Promise<ChatSession>;
  setSessionAgent(params: SetSessionAgentRequest): Promise<ChatSession>;
  renameSession(params: RenameSessionRequest): Promise<ChatSession>;
  deleteSession(params: DeleteSessionRequest): Promise<void>;
  listSessions(params?: ListSessionsRequest): Promise<PageResult<ChatSession>>;
  listHistoryMessages(params: ListHistoryMessagesRequest): Promise<PageResult<WisePenUIMessage>>;
  getTools(): Promise<ToolOption[]>;
  getUserProviders(): Promise<ChatProvider[]>;
  createUserProvider(params: CreateChatProviderRequest): Promise<void>;
  updateUserProvider(params: UpdateChatProviderRequest): Promise<void>;
  deleteUserProvider(providerId: string): Promise<void>;
  getUserModels(): Promise<ChatModelConfig[]>;
  getBindableModels(): Promise<ChatModelConfig[]>;
  createUserModel(params: CreateChatUserModelRequest): Promise<void>;
  updateUserModel(params: UpdateChatUserModelRequest): Promise<void>;
  deleteUserModel(modelId: string): Promise<void>;
  bindModelProvider(params: BindChatModelProviderRequest): Promise<void>;
  unbindModelProvider(modelId: string, providerId: string): Promise<void>;
  updateUserToolConfig(params: UpdateUserToolConfigRequest): Promise<ToolOption>;
  deleteUserToolConfig(toolName: string): Promise<void>;
  uploadAttachment(params: UploadAttachmentParams): Promise<UploadAttachmentResult>;
}

export interface UpdateUserToolConfigRequest {
  toolName: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
  secretConfig?: Record<string, string>;
}

/** `GET /chat/model/listAvailableModels` 的 data 字段结构 */
/** 会话重命名请求参数（UI 侧使用 camelCase，Service 内部映射为接口字段） */
export interface RenameSessionRequest {
  sessionId: string;
  newTitle?: string;
}

/** 创建会话请求参数（与 POST /session/createSession 对齐） */
export interface CreateSessionRequest {
  title?: string;
  agentId?: string | null;
  agentVersion?: number | null;
}

export interface SetSessionAgentRequest {
  sessionId: string;
  agentId?: string | null;
  agentVersion?: number | null;
}

/** 会话实体 */
export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  agentId?: string | null;
  agentVersion?: number | null;
}

/** 删除会话请求参数 */
export interface DeleteSessionRequest {
  sessionId: string;
}

/** 拉取会话列表请求参数 */
export interface ListSessionsRequest {
  page?: number;
  size?: number;
}

/** 拉取历史消息请求参数 */
export interface ListHistoryMessagesRequest {
  sessionId: string;
  page?: number;
  size?: number;
}

/** 分页返回结构 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}
