import { CircleAlert } from 'lucide-react';

import ContentState from '../ContentState';
import type { ErrorStateProps } from './index.type';

function ErrorState({ action, className, description, icon, size, title }: ErrorStateProps) {
  return (
    <ContentState
      action={action}
      className={className}
      description={description}
      icon={
        icon ?? (
          <CircleAlert size={size === 'compact' ? 16 : 20} strokeWidth={1.8} aria-hidden="true" />
        )
      }
      size={size}
      title={title}
      tone="danger"
    />
  );
}

export type { ErrorStateProps } from './index.type';
export default ErrorState;
