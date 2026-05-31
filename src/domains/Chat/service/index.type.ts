import type { Model as BackendModel } from '@/types/model';

/** ChatService 接口 */
export interface IChatService {
  getModels(): Promise<ModelListResponse>;
  createSession(params?: CreateSessionRequest): Promise<ChatSession>;
  renameSession(params: RenameSessionRequest): Promise<ChatSession>;
  deleteSession(params: DeleteSessionRequest): Promise<void>;
  listSessions(params?: ListSessionsRequest): Promise<PageResult<ChatSession>>;
  listHistoryMessages(params: ListHistoryMessagesRequest): Promise<PageResult<MessageResponse>>;
}

/** `GET /model/listModels` 的 data 字段结构 */
export interface ModelListResponse {
  standard_models: BackendModel[];
  advanced_models: BackendModel[];
  other_models: BackendModel[];
}

/** 会话重命名请求参数（UI 侧使用 camelCase，Service 内部映射为接口字段） */
export interface RenameSessionRequest {
  sessionId: string;
  newTitle?: string;
}

/** 创建会话请求参数（与 POST /session/createSession 对齐） */
export interface CreateSessionRequest {
  title?: string;
}

/** 会话实体（与 SessionResponse 对齐） */
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
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

/** 历史消息角色 */
export type MessageRole = 'user' | 'assistant';

/** 历史消息分片 */
export interface MessagePartResponse {
  type: string;
  text: string | null;
  state: string | null;
  toolCallId: string | null;
  input: unknown;
  output: unknown;
}

/** 历史消息实体（与 MessageResponse 对齐） */
export interface MessageResponse {
  id: string;
  role: MessageRole;
  model_id?: number | string | null;
  content?: string;
  parts?: MessagePartResponse[];
  tool_calls?: unknown[] | null;
  createdAt?: string;
  created_at?: string;
}

/** 分页返回结构 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  total_page: number;
}
