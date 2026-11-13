import type { ReactNode } from 'react';

export type FeedbackStatus = 'success' | 'info' | 'warning' | 'error' | '404' | '403' | '500';

export interface ResultStateProps {
  status?: FeedbackStatus;
  title: ReactNode;
  subTitle?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
  className?: string;
}
