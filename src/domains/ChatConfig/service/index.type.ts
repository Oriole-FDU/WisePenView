import type { PageResult } from '@/domains/_shared/entity/page';
import type { Group, IGroupService } from '@/domains/Group';
import type { IResourceService, ResourceSkillSummary } from '@/domains/Resource';

import type { ChatAgentOption } from '../entity/agent';
import type {
  CapabilityToolOption,
  ChatModel,
  ChatModelConfig,
  ChatModelFamily,
  ChatProvider,
  ChatProviderType,
  ToolOption,
} from '../entity/config';

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

export interface CreateChatUserModelRequest {
  displayName: string;
  modelFamily?: ChatModelFamily;
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

export interface UpdateUserToolConfigRequest {
  toolName: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
  secretConfig?: Record<string, string>;
}

export interface ChatConfigServiceDeps {
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

export interface IChatConfigService {
  getModels(): Promise<ChatModel[]>;
  listChatInputGroups(params: ListChatInputGroupsRequest): Promise<PageResult<Group>>;
  listChatInputAgents(params: ListChatInputAgentsRequest): Promise<PageResult<ChatAgentOption>>;
  listChatInputSkills(
    params: ListChatInputSkillsRequest
  ): Promise<PageResult<ResourceSkillSummary>>;
  getChatInputCapabilityOptions(
    params: GetChatInputCapabilityOptionsParams
  ): Promise<ChatInputCapabilityOptions>;
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
}
