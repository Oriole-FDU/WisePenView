import CopyButton from '@/components/Button/CopyButton';
import EntryIcon from '@/components/Icons/EntryIcon';
import { AppPopover } from '@/components/Overlay';
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
import { useTranslation } from 'react-i18next';
import ChatMessage from '../ChatMessage';
import MessageContent from '../Content';
import styles from './style.module.less';

/** fullWidth 默认展示数；侧栏 panel 收窄时最多 1 个 */
const VISIBLE_ATTACHMENT_COUNT_FULL_WIDTH = 2;
const VISIBLE_ATTACHMENT_COUNT_PANEL = 1;

function getAttachmentDescriptionKey(attachment: MessageAttachmentSnapshot): string {
  if (!attachment.available) return 'message.attachments.unavailable';
  return attachment.kind === 'resource'
    ? 'message.attachments.resource'
    : 'message.attachments.attachment';
}

function UserAttachmentChip({ attachment }: { attachment: MessageAttachmentSnapshot }) {
  const { t } = useTranslation('chat');
  return (
    <Attachment
      size="sm"
      state={attachment.available ? 'done' : 'error'}
      className={styles.attachment}
    >
      <AttachmentMedia>
        <EntryIcon entryType="resource" size={16} />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle title={attachment.filename}>{attachment.filename}</AttachmentTitle>
        <AttachmentDescription>{t(getAttachmentDescriptionKey(attachment))}</AttachmentDescription>
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
  const { t } = useTranslation('chat');
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleAttachments = attachments.slice(0, visibleCount);
  const overflowCount = attachments.length - visibleAttachments.length;

  return (
    <AttachmentGroup className={styles.attachments} aria-label={t('message.attachments.groupAria')}>
      {visibleAttachments.map((attachment) => (
        <UserAttachmentChip key={attachment.attachmentId} attachment={attachment} />
      ))}

      {overflowCount > 0 ? (
        <AppPopover isOpen={moreOpen} onOpenChange={setMoreOpen} deferContent={false}>
          <AppPopover.Trigger
            title={t('message.attachments.viewAll', { count: attachments.length })}
          >
            <button
              type="button"
              className={styles.moreTrigger}
              aria-label={t('message.attachments.remaining', { count: overflowCount })}
              aria-expanded={moreOpen}
            >
              +{overflowCount}
            </button>
          </AppPopover.Trigger>
          <AppPopover.Content
            className={styles.morePopover}
            placement="bottom end"
            title={t('message.attachments.allTitle', { count: attachments.length })}
          >
            <div className={styles.morePanel}>
              <ul className={styles.moreList} aria-label={t('message.attachments.allAria')}>
                {attachments.map((attachment) => (
                  <li key={attachment.attachmentId} className={styles.moreItem}>
                    <span className={styles.moreItemIcon} aria-hidden>
                      <EntryIcon entryType="resource" size={16} />
                    </span>
                    <span className={styles.moreItemText}>
                      <span className={styles.moreItemName} title={attachment.filename}>
                        {attachment.filename}
                      </span>
                      <span className={styles.moreItemMeta}>
                        {t(getAttachmentDescriptionKey(attachment))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </AppPopover.Content>
        </AppPopover>
      ) : null}
    </AttachmentGroup>
  );
}

function UserMessage({ message, fullWidth }: { message: WisePenUIMessage; fullWidth: boolean }) {
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
