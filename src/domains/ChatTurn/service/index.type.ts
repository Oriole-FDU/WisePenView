import type { PageResult } from '@/domains/_shared/entity/page';
import type { WisePenUIMessage } from '@/domains/ChatSession';
import type { FrontendStateEntry } from '@/frontendState/definitions';

import type { ChatCompletionApiRequest, ChatRecoverApiRequest } from '../apis/ChatTurnApi.schema';

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

export interface ToolApprovalStatusRequest {
  tool_call_id: string;
  approved: boolean;
}

export interface ClientToolCapability {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface SendTurnMessageOptions {
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

export interface UseChatTurnOptions {
  sessionId: string;
  model?: string;
  getActiveTurnId: (sessionId: string) => Promise<string | null>;
  streamChatCompletion: (
    request: ChatCompletionApiRequest,
    signal?: AbortSignal
  ) => Promise<Response>;
  recoverChatStream: (request: ChatRecoverApiRequest, signal?: AbortSignal) => Promise<Response>;
  reconnectChatStream: (sessionId: string, signal?: AbortSignal) => Promise<Response>;
  /** 新建会话标记：跳过首屏历史 hydrate */
  isNewlyCreatedSession: (sessionId: string) => boolean;
  /** 会话切换 cleanup 时清除新建标记 */
  clearNewlyCreatedSession: (sessionId: string) => void;
  onError?: (error: Error) => void;
}

export interface IChatTurnService {
  streamChatCompletion(request: ChatCompletionApiRequest, signal?: AbortSignal): Promise<Response>;
  recoverChatStream(request: ChatRecoverApiRequest, signal?: AbortSignal): Promise<Response>;
  reconnectChatStream(sessionId: string, signal?: AbortSignal): Promise<Response>;
  getActiveTurnId(sessionId: string): Promise<string | null>;
  cancelTurn(sessionId: string): Promise<void>;
  listHistoryMessages(
    sessionId: string,
    page: number,
    size: number
  ): Promise<PageResult<WisePenUIMessage>>;
}
