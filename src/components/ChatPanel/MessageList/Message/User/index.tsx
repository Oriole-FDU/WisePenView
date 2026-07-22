import EntryIcon from '@/components/Icons/EntryIcon';
import { Popover } from '@/components/Overlay';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/_shadcn';
import type { MessageAttachmentSnapshot, WisePenUIMessage } from '@/domains/Chat';
import { isTextUIPart } from 'ai';
import { useState } from 'react';
import ChatMessage from '../ChatMessage';
import MessageContent from '../Content';
import CopyButton from '../CopyButton';
import styles from './style.module.less';

/** fullWidth 默认展示数；侧栏 panel 收窄时最多 1 个 */
const VISIBLE_ATTACHMENT_COUNT_FULL_WIDTH = 2;
const VISIBLE_ATTACHMENT_COUNT_PANEL = 1;

function getAttachmentDescription(attachment: MessageAttachmentSnapshot): string {
  if (!attachment.available) return '附件已不可用';
  return attachment.kind === 'resource' ? '资源附件' : '附件';
}

function UserAttachmentChip({ attachment }: { attachment: MessageAttachmentSnapshot }) {
  return (
    <Attachment
      size="sm"
      state={attachment.available ? 'done' : 'error'}
      className={styles.attachment}
    >
      <AttachmentMedia>
        <EntryIcon entryType="resource" resourceName={attachment.filename} size={16} />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle title={attachment.filename}>{attachment.filename}</AttachmentTitle>
        <AttachmentDescription>{getAttachmentDescription(attachment)}</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  );
}

function UserMessageAttachments({
  attachments,
  visibleCount,
}: {
  attachments: MessageAttachmentSnapshot[];
  visibleCount: number;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleAttachments = attachments.slice(0, visibleCount);
  const overflowCount = attachments.length - visibleAttachments.length;

  return (
    <AttachmentGroup className={styles.attachments} aria-label="消息附件">
      {visibleAttachments.map((attachment) => (
        <UserAttachmentChip key={attachment.attachmentId} attachment={attachment} />
      ))}

      {overflowCount > 0 ? (
        <Popover isOpen={moreOpen} onOpenChange={setMoreOpen} deferContent={false}>
          <Popover.Trigger title={`查看全部 ${attachments.length} 个附件`}>
            <button
              type="button"
              className={styles.moreTrigger}
              aria-label={`还有 ${overflowCount} 个附件`}
              aria-expanded={moreOpen}
            >
              +{overflowCount}
            </button>
          </Popover.Trigger>
          <Popover.Content className={styles.morePopover} placement="bottom end">
            <Popover.Dialog>
              <div className={styles.morePanel}>
                <div className={styles.moreTitle}>全部附件（{attachments.length}）</div>
                <ul className={styles.moreList} aria-label="全部附件">
                  {attachments.map((attachment) => (
                    <li key={attachment.attachmentId} className={styles.moreItem}>
                      <span className={styles.moreItemIcon} aria-hidden>
                        <EntryIcon
                          entryType="resource"
                          resourceName={attachment.filename}
                          size={16}
                        />
                      </span>
                      <span className={styles.moreItemText}>
                        <span className={styles.moreItemName} title={attachment.filename}>
                          {attachment.filename}
                        </span>
                        <span className={styles.moreItemMeta}>
                          {getAttachmentDescription(attachment)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      ) : null}
    </AttachmentGroup>
  );
}

function UserMessage({
  message,
  fullWidth = false,
}: {
  message: WisePenUIMessage;
  fullWidth?: boolean;
}) {
  const content = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('');
  const attachments = message.metadata?.selectedAttachments ?? [];
  const visibleAttachmentCount = fullWidth
    ? VISIBLE_ATTACHMENT_COUNT_FULL_WIDTH
    : VISIBLE_ATTACHMENT_COUNT_PANEL;

  return (
    <ChatMessage.User>
      {attachments.length > 0 ? (
        <UserMessageAttachments attachments={attachments} visibleCount={visibleAttachmentCount} />
      ) : null}

      {content ? (
        <ChatMessage.Bubble>
          <ChatMessage.Content>
            <MessageContent content={content} />
          </ChatMessage.Content>
        </ChatMessage.Bubble>
      ) : null}

      {content ? (
        <ChatMessage.Actions>
          <CopyButton text={content} />
        </ChatMessage.Actions>
      ) : null}
    </ChatMessage.User>
  );
}

export default UserMessage;
