import type { ChatAgentOption } from '@/domains/Chat';

import type { SendOptions } from '../../send.type';

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
}

export type { LocalAttachmentPayload, LocalAttachmentUpload, SendOptions } from '../../send.type';
