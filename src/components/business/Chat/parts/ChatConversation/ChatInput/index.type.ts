import type { Ref } from 'react';

import type { ChatAgentOption } from '@/domains/ChatConfig';

import type { SendOptions } from '../../../index.type';

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

/** 旁路预填入口（如 Welcome 点选），不暴露 store。 */
export interface ChatInputHandle {
  setValue: (value: string) => void;
}

export interface ChatInputProps {
  onSend: (text: string, opts?: SendOptions) => boolean | void | Promise<boolean | void>;
  getUploadSessionId: () => Promise<string | undefined>;
  sending: boolean;
  sessionId?: string;
  promoteDraftToolSelection: boolean;
  onCancel?: () => void | Promise<void>;
  contextPreview?: string;
  onClearContext?: () => void;
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
  /** 全宽页默认可展示模型名；窄宽时自动仅图标（与侧栏一致） */
  fullWidth: boolean;
  handleRef?: Ref<ChatInputHandle | null>;
}
