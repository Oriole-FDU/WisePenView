import type { FrontendStateEntry } from '@/frontendState/definitions';

import type { ChatCompletionApiRequest, ChatRecoverApiRequest } from '../apis/ChatStreamApi.schema';

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
  onError?: (error: Error) => void;
}

export interface IChatTurnService {
  streamChatCompletion(request: ChatCompletionApiRequest, signal?: AbortSignal): Promise<Response>;
  recoverChatStream(request: ChatRecoverApiRequest, signal?: AbortSignal): Promise<Response>;
  reconnectChatStream(sessionId: string, signal?: AbortSignal): Promise<Response>;
  getActiveTurnId(sessionId: string): Promise<string | null>;
  cancelTurn(sessionId: string): Promise<void>;
}
