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

/**
 * Router.send 意图。
 * send 始终打当前前台；仅当还没有前台（新建空白对话首发）时用 create 做 lazy create。
 */
export type ChatRouterSendRequest = SessionSendOptions & {
  /** 无前台时带到 createSession；已有前台时用于同步 agent */
  create?: CreateSessionRequest;
};
