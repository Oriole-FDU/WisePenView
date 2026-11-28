import type { ReactNode } from 'react';

export interface InlineEditErrorProps {
  message: ReactNode;
  onDismiss?: () => void;
  className?: string;
}
