import type { ReactNode } from 'react';

import type { ContentStateSize } from '../ContentState';

export interface ErrorStateProps {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  size?: ContentStateSize;
  title: ReactNode;
}
