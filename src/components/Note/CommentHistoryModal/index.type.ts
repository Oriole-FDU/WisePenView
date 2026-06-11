import type { ReactNode } from 'react';

export interface CommentHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}
