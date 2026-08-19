import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/_shadcn/attachment';
import { cn } from '@/utils/cn';
import { ProgressBar } from '@heroui/react';
import { FileText, Image as ImageIcon, Paperclip, X } from 'lucide-react';

import type { ReactNode } from 'react';
import type {
  ChatAttachmentChipKind,
  ChatAttachmentChipProps,
  ChatAttachmentChipSize,
} from './index.type';
import styles from './style.module.less';

const fallbackIconByKind: Record<ChatAttachmentChipKind, ReactNode> = {
  file: <Paperclip size={16} aria-hidden />,
  image: <ImageIcon size={16} aria-hidden />,
  resource: <FileText size={16} aria-hidden />,
};

const attachmentSizeMap: Record<ChatAttachmentChipSize, ChatAttachmentChipSize> = {
  default: 'default',
  sm: 'sm',
  xs: 'xs',
};

function ChatAttachmentChip({
  title,
  description,
  kind = 'file',
  state = 'done',
  size = 'sm',
  thumbnailUrl,
  icon,
  progress,
  actions,
  onRemove,
  removeLabel = 'Remove attachment',
  className,
  ...props
}: ChatAttachmentChipProps) {
  const mediaIcon = icon ?? fallbackIconByKind[kind];
  const hasCustomActions = Boolean(actions);

  return (
    <Attachment
      className={cn(styles.root, className)}
      state={state}
      size={attachmentSizeMap[size]}
      {...props}
    >
      <AttachmentMedia variant={thumbnailUrl ? 'image' : 'icon'}>
        {thumbnailUrl ? <img src={thumbnailUrl} alt="" /> : mediaIcon}
      </AttachmentMedia>
      <AttachmentContent className={styles.content}>
        <AttachmentTitle
          className={styles.title}
          title={typeof title === 'string' ? title : undefined}
        >
          {title}
        </AttachmentTitle>
        {description && state !== 'uploading' ? (
          <AttachmentDescription title={typeof description === 'string' ? description : undefined}>
            {description}
          </AttachmentDescription>
        ) : null}
        {state === 'uploading' ? (
          <div className={styles.progressRow}>
            <ProgressBar
              aria-label={typeof title === 'string' ? `Uploading ${title}` : 'Upload progress'}
              size="sm"
              value={Math.max(0, Math.min(progress ?? 0, 100))}
              className={styles.progressBar}
            >
              <ProgressBar.Track className={styles.progressTrack}>
                <ProgressBar.Fill className={styles.progressFill} />
              </ProgressBar.Track>
            </ProgressBar>
            <span className={styles.progressValue}>
              {Math.max(0, Math.min(progress ?? 0, 100))}%
            </span>
          </div>
        ) : null}
      </AttachmentContent>
      {hasCustomActions || onRemove ? (
        <AttachmentActions className={styles.actions}>
          {actions}
          {!hasCustomActions && onRemove ? (
            <AttachmentAction label={removeLabel} onPress={onRemove}>
              <X size={12} aria-hidden />
            </AttachmentAction>
          ) : null}
        </AttachmentActions>
      ) : null}
    </Attachment>
  );
}

export type {
  ChatAttachmentChipKind,
  ChatAttachmentChipProps,
  ChatAttachmentChipSize,
  ChatAttachmentChipState,
} from './index.type';
export default ChatAttachmentChip;
