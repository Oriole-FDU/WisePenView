import type { Model } from '@/components/ChatPanel/index.type';
import type { CapabilitySkillSelection, CapabilityToolOption } from '@/domains/Chat';

export interface ChatInputProps {
  onSend: (text: string, opts?: SendOptions) => void | Promise<void>;
  getUploadSessionId: () => Promise<string>;
  sending: boolean;
  onStop?: () => void;
  contextPreview?: string;
  onClearContext?: () => void;
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
  model?: Model;
  activeDocRefs?: LocalResourcePayload[];
  activeAttachments?: LocalAttachmentPayload[];
  selectedSkills?: CapabilitySkillSelection[];
  selectedTools?: CapabilityToolOption[];
}
