import type { PageResult } from '@/domains/_shared/entity/page';
import type { FrontendStateEntry } from '@/frontendState/definitions';

import type {
  ChatCompletionApiRequest,
  ChatRecoverApiRequest,
  ChatRespondApiRequest,
} from '../apis/ChatTurnApi.schema';
import type { WisePenUIMessage } from '../entity/message';

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

export interface IChatTurnService {
  streamChatCompletion(request: ChatCompletionApiRequest, signal?: AbortSignal): Promise<Response>;
  recoverChatStream(request: ChatRecoverApiRequest, signal?: AbortSignal): Promise<Response>;
  reconnectChatStream(sessionId: string, signal?: AbortSignal): Promise<Response>;
  respondTurn(request: ChatRespondApiRequest): Promise<void>;
  getActiveTurnId(sessionId: string): Promise<string | null>;
  cancelTurn(sessionId: string): Promise<void>;
  listHistoryMessages(
    sessionId: string,
    page: number,
    size: number
  ): Promise<PageResult<WisePenUIMessage>>;
}
