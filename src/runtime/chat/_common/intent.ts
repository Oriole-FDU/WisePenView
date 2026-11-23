import type { FrontendStateEntry } from '@/frontendState/definitions';

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
