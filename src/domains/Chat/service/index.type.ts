import type { Group, IGroupService } from '@/domains/Group';
import type { IResourceService, ResourceSkillSummary } from '@/domains/Resource';
import type { ChatAgentOption } from '../entity/agent';
import type { WisePenUIMessage } from '../entity/message';
import type { CapabilityToolOption } from '../mapper/capabilityPicker.mapper';
import type { SkillScopeTreeGroup } from '../mapper/skillScope.mapper';

export interface ToolOption {
  toolId: string;
  label: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  requiresConfig: boolean;
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
  category: 'reasoning' | 'chat' | 'coding' | 'all-round';
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

export interface ChatWorkspace {
  groups: Group[];
  skills: ResourceSkillSummary[];
  personalAgents: ChatAgentOption[];
  groupAgents: ChatAgentOption[];
}

export interface ChatInputCapabilityOptions {
  primarySkills: ResourceSkillSummary[];
  otherSkillGroups: SkillScopeTreeGroup[];
  tools: CapabilityToolOption[];
}

export interface GetChatInputCapabilityOptionsParams {
  agent: ChatAgentOption | null;
}

/** ChatService 接口 */
export interface IChatService {
  getModels(): Promise<ChatModel[]>;
  getWorkspace(): Promise<ChatWorkspace>;
  getChatInputAgents(): Promise<ChatAgentOption[]>;
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
  uploadAttachment(params: UploadAttachmentParams): Promise<UploadAttachmentResult>;
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
