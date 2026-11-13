import type { ReactNode } from 'react';

import type { ContentStateSize } from '../ContentState';

export interface EmptyStateProps {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  showIcon?: boolean;
  size?: ContentStateSize;
  title?: ReactNode;
}
