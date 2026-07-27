import type {
  CapabilitySkillSelection,
  CapabilityToolOption,
  ChatAgentOption,
  ChatModel,
} from '@/domains/Chat';

export interface ChatInputProps {
  onSend: (text: string, opts?: SendOptions) => boolean | void | Promise<boolean | void>;
  getUploadSessionId: () => Promise<string>;
  sending: boolean;
  onStop?: () => void;
  contextPreview?: string;
  onClearContext?: () => void;
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
  /** 全宽页默认可展示模型名；窄宽时自动仅图标（与侧栏一致） */
  fullWidth: boolean;
}

export interface LocalAttachmentPayload {
  attachmentId: string;
  filename: string;
  enabled: boolean;
}

export interface LocalResourcePayload {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  enabled: boolean;
}

export interface LocalPendingImageMeta {
  id: string;
  mimeType: string;
  filename: string;
  thumbnailUrl: string;
}

export interface LocalAttachmentUpload {
  id: string;
  filename: string;
  status: 'pending' | 'uploading' | 'failed';
}

export interface SendOptions {
  model?: ChatModel;
  selectedAgent?: ChatAgentOption;
  activeDocRefs?: LocalResourcePayload[];
  activeAttachments?: LocalAttachmentPayload[];
  selectedSkills?: CapabilitySkillSelection[];
  selectedTools?: CapabilityToolOption[];
}
