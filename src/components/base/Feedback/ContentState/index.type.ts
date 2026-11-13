import type { ReactNode } from 'react';

export type ContentStateSize = 'default' | 'compact';

export interface ContentStateProps {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  size?: ContentStateSize;
  title: ReactNode;
  tone: 'neutral' | 'danger';
}
