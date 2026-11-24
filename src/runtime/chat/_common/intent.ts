import type { CreateSessionRequest } from '@/domains/ChatSession';
import type { FrontendStateEntry } from '@/frontendState/definitions';

export type SessionBootstrapKind = 'createSession' | 'loadSession';

export interface SessionApprovalDecision {
  toolCallId: string;
  approved: boolean;
}

export interface SessionSelectedResource {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  enabled: boolean;
}

export interface SessionUploadedAttachment {
  attachmentId: string;
  filename: string;
  enabled: boolean;
}

export interface SessionSendOptions {
  model?: string;
  providerId?: string;
  runtimeOptions?: Record<string, unknown>;
  frontendStates?: FrontendStateEntry[];
  selectedResources?: SessionSelectedResource[];
  uploadedAttachments?: SessionUploadedAttachment[];
  toolSelectionOverrides?: Record<string, boolean>;
  onDemandSkillIds?: string[];
}

export type ChatRouterSendRequest = SessionSendOptions & {
  /** 发起发送时 URL 指向的会话；空白对话在发送前创建。 */
  sessionId: string | undefined;
  create?: CreateSessionRequest;
  /** lazy create 完成后、发送开始前绑定新的 session 路由 */
  onSessionCreated?: (sessionId: string) => Promise<void>;
};
