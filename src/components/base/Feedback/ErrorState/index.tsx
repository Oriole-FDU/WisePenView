import { CircleAlert } from 'lucide-react';

import { parseErrorMessage } from '@/utils/error/parseErrorMessage';

import ContentState from '../ContentState';
import type { ErrorStateProps } from './index.type';

function ErrorState({ action, className, error, icon, size, title }: ErrorStateProps) {
  const message = parseErrorMessage(error);

  return (
    <ContentState
      action={action}
      className={className}
      description={title != null ? message : undefined}
      icon={
        icon ?? (
          <CircleAlert size={size === 'compact' ? 16 : 20} strokeWidth={1.8} aria-hidden="true" />
        )
      }
      size={size}
      title={title ?? message}
      tone="danger"
    />
  );
}

export type { ErrorStateProps } from './index.type';
export default ErrorState;
