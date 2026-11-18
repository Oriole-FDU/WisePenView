import type { UIMessage } from 'ai';

export interface MessageAttachmentSnapshot {
  attachmentId: string;
  filename: string;
  kind: 'temporary' | 'resource';
  available: boolean;
}

export interface ChatMessageMetadata {
  createdAt?: string;
  selectedAttachments?: MessageAttachmentSnapshot[];
  modelId?: string;
  providerId?: string;
  provider?: string;
  modelName?: string;
  reasoningDurationSeconds?: number;
}

export interface ToolApprovalRequestData {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export type ChatMessageDataParts = {
  'tool-approval-request': ToolApprovalRequestData;
};

export type WisePenUIMessage = UIMessage<ChatMessageMetadata, ChatMessageDataParts>;
