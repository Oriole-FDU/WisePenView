import type { PageResult } from '@/domains/_shared/entity/page';
import type { FrontendStateEntry } from '@/frontendState/definitions';

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

/** 审批续跑领域命令：Runtime 只传意图，DTO 由 Service/mapper 组装。 */
export interface SubmitToolApprovalsCommand {
  sessionId: string;
  toolApprovalStatus: ToolApprovalStatusRequest[];
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

/** 发送回合领域命令：Runtime 只传意图，completion DTO 由 Service/mapper 组装。 */
export interface SendTurnCommand {
  sessionId: string;
  model?: string;
  query: string;
  options?: SendTurnMessageOptions;
}

export interface IChatTurnService {
  streamChatCompletion(command: SendTurnCommand, signal?: AbortSignal): Promise<Response>;
  recoverChatStream(command: SubmitToolApprovalsCommand, signal?: AbortSignal): Promise<Response>;
  reconnectChatStream(sessionId: string, signal?: AbortSignal): Promise<Response>;
  respondTurn(command: SubmitToolApprovalsCommand): Promise<void>;
  getActiveTurnId(sessionId: string): Promise<string | null>;
  cancelTurn(sessionId: string): Promise<void>;
  listHistoryMessages(
    sessionId: string,
    page: number,
    size: number
  ): Promise<PageResult<WisePenUIMessage>>;
}
