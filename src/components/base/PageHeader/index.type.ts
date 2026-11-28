import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  titleId?: string;
  className?: string;
  contentClassName?: string;
  actionsClassName?: string;
}
