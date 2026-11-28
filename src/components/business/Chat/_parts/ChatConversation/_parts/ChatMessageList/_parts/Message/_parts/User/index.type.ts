import type { MessageAttachmentSnapshot, WisePenUIMessage } from '@/domains/ChatSession';

export interface UserMessageProps {
  message: WisePenUIMessage;
  fullWidth: boolean;
}

export type UserAttachmentChipProps = { attachment: MessageAttachmentSnapshot };

export type UserMessageAttachmentsProps = {
  attachments: MessageAttachmentSnapshot[];
  visibleCount: number;
};
