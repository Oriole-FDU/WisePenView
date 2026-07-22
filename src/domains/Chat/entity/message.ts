import type { UIMessage } from 'ai';

export interface MessageAttachmentSnapshot {
  attachmentId: string;
  filename: string;
  kind: 'temporary' | 'resource';
  available: boolean;
}

export interface ChatMessageMetadata {
  createdAt?: string;
  /** 本轮用户消息附件快照 */
  selectedAttachments?: MessageAttachmentSnapshot[];
  /** 助手消息模型快照 */
  modelId?: string;
  providerId?: string;
  provider?: string;
  modelName?: string;
  /**
   * 推理耗时（秒）。仅前端本地计时展示；待后端持久化并在 listHistoryMessages metadata 回传后接上。
   */
  reasoningDurationSeconds?: number;
}

export type WisePenUIMessage = UIMessage<ChatMessageMetadata>;
