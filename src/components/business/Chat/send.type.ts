import type { CapabilitySkillSelection, ChatAgentOption, ChatModel } from '@/domains/Chat';

export interface LocalAttachmentPayload {
  attachmentId: string;
  filename: string;
  enabled: boolean;
  kind?: 'file' | 'image';
  thumbnailUrl?: string;
}

export interface LocalAttachmentUpload {
  id: string;
  filename: string;
  status: 'uploading' | 'failed';
  kind?: 'file' | 'image';
  thumbnailUrl?: string;
}

/** ChatConversation、ChatInput 与 Chat controller 共用的发送载荷。 */
export interface SendOptions {
  model?: ChatModel;
  selectedAgent?: ChatAgentOption;
  activeAttachments?: LocalAttachmentPayload[];
  selectedSkills?: CapabilitySkillSelection[];
  toolSelectionOverrides?: Record<string, boolean>;
}
