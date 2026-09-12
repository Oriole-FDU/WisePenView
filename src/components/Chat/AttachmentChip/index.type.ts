import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type ChatAttachmentChipKind = 'file' | 'image' | 'resource';
export type ChatAttachmentChipState = 'idle' | 'uploading' | 'error' | 'done';
export type ChatAttachmentChipSize = 'default' | 'sm' | 'xs';

export interface ChatAttachmentChipProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'title'
> {
  title: ReactNode;
  description?: ReactNode;
  kind?: ChatAttachmentChipKind;
  state?: ChatAttachmentChipState;
  size?: ChatAttachmentChipSize;
  thumbnailUrl?: string;
  icon?: ReactNode;
  progress?: number;
  actions?: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}
